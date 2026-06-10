// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PredictionMarket} from "./PredictionMarket.sol";
import {MarketRegistry} from "./MarketRegistry.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MarketFactory {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error MarketCreationPaused();
    error InvalidMarketParameters();
    error MarketDurationOutOfBounds();
    error MarketExposureOutOfBounds();
    error InsufficientCreationBond();
    error InvalidAddress();
    error InvalidFee();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event MarketCreated(
        address indexed creator,
        address indexed market,
        bytes32 indexed marketId,
        uint256 startTime,
        uint256 endTime,
        uint256 maxExposure,
        address collateralToken,
        string metadataURI
    );

    event MarketCreationPausedSet(bool paused);
    event MarketParametersUpdated(
        uint256 minDuration,
        uint256 maxDuration,
        uint256 maxMarketExposure,
        uint256 creationBond
    );
    event MarketCreationBondCollected(
        address indexed creator,
        uint256 amount
    );

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Registry tracking all valid markets
    MarketRegistry public immutable marketRegistry;

    /// @notice Governance-controlled pause flag
    bool public marketCreationPaused;

    /// @notice Governance parameters (bounded by design docs)
    uint256 public minMarketDuration;
    uint256 public maxMarketDuration;
    uint256 public maxMarketExposure;
    uint256 public marketCreationBond;
    uint256 public feeBps;
    uint256 public disputeWindow;

    /// @notice Governance authority (DAO / Timelock)
    address public immutable governance;
    address public settlementAuthority;
    IERC20 public immutable collateralToken;
    address public feeTreasury;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyGovernance() {
        require(msg.sender == governance, "ONLY_GOVERNANCE");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _governance,
        address _marketRegistry,
        uint256 _minMarketDuration,
        uint256 _maxMarketDuration,
        uint256 _maxMarketExposure,
        uint256 _marketCreationBond,
        address _settlementAuthority,
        address _collateralToken,
        address _feeTreasury,
        uint256 _feeBps,
        uint256 _disputeWindow
    ) {
        require(_governance != address(0), "INVALID_GOVERNANCE");
        require(_marketRegistry != address(0), "INVALID_REGISTRY");
        require(_settlementAuthority != address(0), "INVALID_SETTLEMENT_AUTHORITY");
        require(_collateralToken != address(0), "INVALID_COLLATERAL");
        require(_feeTreasury != address(0), "INVALID_FEE_TREASURY");
        require(_minMarketDuration > 0, "INVALID_MIN_DURATION");
        require(_maxMarketDuration > _minMarketDuration, "INVALID_MAX_DURATION");
        if (_feeBps > 1_000) revert InvalidFee();

        governance = _governance;
        marketRegistry = MarketRegistry(_marketRegistry);
        settlementAuthority = _settlementAuthority;
        collateralToken = IERC20(_collateralToken);
        feeTreasury = _feeTreasury;

        minMarketDuration = _minMarketDuration;
        maxMarketDuration = _maxMarketDuration;
        maxMarketExposure = _maxMarketExposure;
        marketCreationBond = _marketCreationBond;
        feeBps = _feeBps;
        disputeWindow = _disputeWindow;
    }

    /*//////////////////////////////////////////////////////////////
                        GOVERNANCE CONTROLS
    //////////////////////////////////////////////////////////////*/

    function setMarketCreationPaused(bool paused) external onlyGovernance {
        marketCreationPaused = paused;
        emit MarketCreationPausedSet(paused);
    }

    function updateMarketParameters(
        uint256 _minMarketDuration,
        uint256 _maxMarketDuration,
        uint256 _maxMarketExposure,
        uint256 _marketCreationBond
    ) external onlyGovernance {
        if (_minMarketDuration == 0 || _maxMarketDuration <= _minMarketDuration) {
            revert InvalidMarketParameters();
        }

        minMarketDuration = _minMarketDuration;
        maxMarketDuration = _maxMarketDuration;
        maxMarketExposure = _maxMarketExposure;
        marketCreationBond = _marketCreationBond;

        emit MarketParametersUpdated(
            _minMarketDuration,
            _maxMarketDuration,
            _maxMarketExposure,
            _marketCreationBond
        );
    }

    function updateRuntimeConfig(
        address _settlementAuthority,
        address _feeTreasury,
        uint256 _feeBps,
        uint256 _disputeWindow
    ) external onlyGovernance {
        if (_settlementAuthority == address(0) || _feeTreasury == address(0)) {
            revert InvalidAddress();
        }
        if (_feeBps > 1_000) revert InvalidFee();

        settlementAuthority = _settlementAuthority;
        feeTreasury = _feeTreasury;
        feeBps = _feeBps;
        disputeWindow = _disputeWindow;
    }

    /*//////////////////////////////////////////////////////////////
                        MARKET CREATION LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Create a new prediction market
     *
     * @dev Enforces:
     * - duration bounds
     * - exposure bounds
     * - creation bond (anti-spam)
     * - global pause
     *
     * @param marketId Deterministic identifier (e.g., hash of prompt)
     * @param startTime UNIX timestamp when market opens
     * @param endTime UNIX timestamp when market closes
     * @param maxExposure Maximum total capital exposure
     * @param metadataURI Off-chain metadata reference (IPFS/Arweave)
     */
    function createMarket(
        bytes32 marketId,
        uint256 startTime,
        uint256 endTime,
        uint256 maxExposure,
        string calldata metadataURI
    ) external returns (address marketAddress) {
        if (marketCreationPaused) {
            revert MarketCreationPaused();
        }

        if (marketCreationBond > 0) {
            collateralToken.safeTransferFrom(msg.sender, feeTreasury, marketCreationBond);
            emit MarketCreationBondCollected(msg.sender, marketCreationBond);
        }

        if (endTime <= startTime) {
            revert InvalidMarketParameters();
        }

        uint256 duration = endTime - startTime;

        if (duration < minMarketDuration || duration > maxMarketDuration) {
            revert MarketDurationOutOfBounds();
        }

        if (maxExposure == 0 || maxExposure > maxMarketExposure) {
            revert MarketExposureOutOfBounds();
        }

        // Deploy new market
        PredictionMarket market = new PredictionMarket(
            marketId,
            msg.sender,
            startTime,
            endTime,
            maxExposure,
            governance,
            settlementAuthority,
            address(collateralToken),
            feeTreasury,
            feeBps,
            disputeWindow
        );

        marketAddress = address(market);

        // Register market as canonical
        marketRegistry.registerMarket(marketAddress, marketId);

        emit MarketCreated(
            msg.sender,
            marketAddress,
            marketId,
            startTime,
            endTime,
            maxExposure,
            address(collateralToken),
            metadataURI
        );
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function isCreationPaused() external view returns (bool) {
        return marketCreationPaused;
    }

    function getMarketParameters()
        external
        view
        returns (
            uint256 minDuration,
            uint256 maxDuration,
            uint256 maxExposure,
            uint256 creationBond
        )
    {
        return (
            minMarketDuration,
            maxMarketDuration,
            maxMarketExposure,
            marketCreationBond
        );
    }
}
