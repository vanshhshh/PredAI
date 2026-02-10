import {PredictionMarket} from "./PredictionMarket.sol";
import {MarketRegistry} from "./MarketRegistry.sol";

contract MarketFactory {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error MarketCreationPaused();
    error InvalidMarketParameters();
    error MarketDurationOutOfBounds();
    error MarketExposureOutOfBounds();
    error InsufficientCreationBond();

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
        string metadataURI
    );

    event MarketCreationPausedSet(bool paused);
    event MarketParametersUpdated(
        uint256 minDuration,
        uint256 maxDuration,
        uint256 maxMarketExposure,
        uint256 creationBond
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

    /// @notice Governance authority (DAO / Timelock)
    address public governance;

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
        uint256 _marketCreationBond
    ) {
        require(_governance != address(0), "INVALID_GOVERNANCE");
        require(_marketRegistry != address(0), "INVALID_REGISTRY");
        require(_minMarketDuration > 0, "INVALID_MIN_DURATION");
        require(_maxMarketDuration > _minMarketDuration, "INVALID_MAX_DURATION");

        governance = _governance;
        marketRegistry = MarketRegistry(_marketRegistry);

        minMarketDuration = _minMarketDuration;
        maxMarketDuration = _maxMarketDuration;
        maxMarketExposure = _maxMarketExposure;
        marketCreationBond = _marketCreationBond;
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
    ) external payable returns (address marketAddress) {
        if (marketCreationPaused) {
            revert MarketCreationPaused();
        }

        if (msg.value < marketCreationBond) {
            revert InsufficientCreationBond();
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
            governance
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