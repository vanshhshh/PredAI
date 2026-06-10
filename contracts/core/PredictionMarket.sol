// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    PredictionMarket.sol

    PURPOSE
    -------
    Canonical on-chain market contract responsible for:
    - capital custody (escrow only)
    - bet placement and accounting
    - exposure enforcement
    - settlement execution
    - payout distribution

    GUARANTEES (from docs)
    ---------------------
    - Non-custodial: users always interact directly with this contract
    - Deterministic: no off-chain or discretionary logic
    - Event-sourced: every state transition emits events
    - Invariant-driven: exposure, timing, and settlement rules enforced
    - Governance-bounded: emergency controls only via governance

    TRUST MODEL
    -----------
    - Callers are untrusted
    - Oracles resolve outcome externally
    - This contract enforces final settlement only
*/

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PredictionMarket is Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error MarketNotOpen();
    error MarketClosed();
    error MarketAlreadySettled();
    error MarketNotSettled();
    error InvalidOutcome();
    error ExposureExceeded();
    error ZeroAmount();
    error OnlyGovernance();
    error OnlySettlementAuthority();
    error MarketCanceled();
    error MarketNotClosed();
    error InvalidFee();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event BetPlaced(
        address indexed bettor,
        bool indexed outcome,
        uint256 amount
    );

    event MarketSettled(
        bool outcome,
        uint256 totalYes,
        uint256 totalNo
    );

    event PayoutClaimed(
        address indexed bettor,
        uint256 amount
    );

    event RefundClaimed(
        address indexed bettor,
        uint256 amount
    );

    event MarketCanceledEvent();
    event MarketPausedSet(bool paused);
    event FeesWithdrawn(address indexed treasury, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    bytes32 public immutable marketId;
    address public immutable creator;
    address public immutable governance;
    address public immutable settlementAuthority;
    IERC20 public immutable collateralToken;
    address public immutable feeTreasury;

    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint256 public immutable maxExposure;
    uint256 public immutable disputeWindow;
    uint256 public immutable feeBps;

    bool public settled;
    bool public canceled;
    bool public finalOutcome;

    uint256 public totalYes;
    uint256 public totalNo;
    uint256 public accruedFees;

    mapping(address => uint256) public yesBets;
    mapping(address => uint256) public noBets;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyGovernance() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    modifier onlySettlementAuthority() {
        if (msg.sender != settlementAuthority) revert OnlySettlementAuthority();
        _;
    }

    modifier marketOpen() {
        if (block.timestamp < startTime) revert MarketNotOpen();
        if (block.timestamp >= endTime) revert MarketClosed();
        if (canceled) revert MarketCanceled();
        _;
    }

    modifier notSettled() {
        if (settled) revert MarketAlreadySettled();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        bytes32 _marketId,
        address _creator,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _maxExposure,
        address _governance,
        address _settlementAuthority,
        address _collateralToken,
        address _feeTreasury,
        uint256 _feeBps,
        uint256 _disputeWindow
    ) {
        require(_creator != address(0), "INVALID_CREATOR");
        require(_governance != address(0), "INVALID_GOVERNANCE");
        require(_settlementAuthority != address(0), "INVALID_SETTLEMENT_AUTHORITY");
        require(_collateralToken != address(0), "INVALID_COLLATERAL");
        require(_feeTreasury != address(0), "INVALID_FEE_TREASURY");
        require(_endTime > _startTime, "INVALID_TIME");
        if (_feeBps > 1_000) revert InvalidFee();

        marketId = _marketId;
        creator = _creator;
        startTime = _startTime;
        endTime = _endTime;
        maxExposure = _maxExposure;
        governance = _governance;
        settlementAuthority = _settlementAuthority;
        collateralToken = IERC20(_collateralToken);
        feeTreasury = _feeTreasury;
        feeBps = _feeBps;
        disputeWindow = _disputeWindow;
    }

    /*//////////////////////////////////////////////////////////////
                          BETTING LOGIC
    //////////////////////////////////////////////////////////////*/

    function betYes(uint256 amount)
        external
        marketOpen
        notSettled
        whenNotPaused
        nonReentrant
    {
        _placeBet(true, amount);
    }

    function betNo(uint256 amount)
        external
        marketOpen
        notSettled
        whenNotPaused
        nonReentrant
    {
        _placeBet(false, amount);
    }

    function _placeBet(bool outcome, uint256 amount) internal {
        if (amount == 0) revert ZeroAmount();

        uint256 newExposure = totalYes + totalNo + amount;
        if (newExposure > maxExposure) revert ExposureExceeded();

        if (outcome) {
            yesBets[msg.sender] += amount;
            totalYes += amount;
        } else {
            noBets[msg.sender] += amount;
            totalNo += amount;
        }

        collateralToken.safeTransferFrom(msg.sender, address(this), amount);
        emit BetPlaced(msg.sender, outcome, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        SETTLEMENT LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Settle the market with final outcome
     * @dev Called by governance-controlled settlement engine
     */
    function settle(bool outcome)
        external
        onlySettlementAuthority
        notSettled
    {
        if (canceled) revert MarketCanceled();
        if (block.timestamp < endTime + disputeWindow) revert MarketNotClosed();

        settled = true;
        finalOutcome = outcome;

        emit MarketSettled(outcome, totalYes, totalNo);
    }

    function cancelMarket() external onlyGovernance notSettled {
        if (canceled) revert MarketCanceled();
        canceled = true;
        emit MarketCanceledEvent();
    }

    function setPaused(bool paused) external onlyGovernance {
        if (paused) {
            _pause();
        } else {
            _unpause();
        }
        emit MarketPausedSet(paused);
    }

    /*//////////////////////////////////////////////////////////////
                          CLAIM LOGIC
    //////////////////////////////////////////////////////////////*/

    function claim() external nonReentrant {
        if (canceled) {
            uint256 refund = yesBets[msg.sender] + noBets[msg.sender];
            if (refund == 0) revert ZeroAmount();

            yesBets[msg.sender] = 0;
            noBets[msg.sender] = 0;
            collateralToken.safeTransfer(msg.sender, refund);

            emit RefundClaimed(msg.sender, refund);
            return;
        }

        if (!settled) revert MarketNotSettled();

        uint256 pool = totalYes + totalNo;
        uint256 winningPool = finalOutcome ? totalYes : totalNo;

        if (winningPool == 0) {
            uint256 refund = yesBets[msg.sender] + noBets[msg.sender];
            if (refund == 0) revert ZeroAmount();

            yesBets[msg.sender] = 0;
            noBets[msg.sender] = 0;
            collateralToken.safeTransfer(msg.sender, refund);

            emit RefundClaimed(msg.sender, refund);
            return;
        }

        uint256 stake;

        if (finalOutcome) {
            stake = yesBets[msg.sender];
            if (stake == 0) revert ZeroAmount();
            yesBets[msg.sender] = 0;
        } else {
            stake = noBets[msg.sender];
            if (stake == 0) revert ZeroAmount();
            noBets[msg.sender] = 0;
        }

        uint256 payout = (stake * pool) / winningPool;
        uint256 profit = payout > stake ? payout - stake : 0;
        uint256 fee = (profit * feeBps) / 10_000;
        uint256 netPayout = payout - fee;
        accruedFees += fee;

        collateralToken.safeTransfer(msg.sender, netPayout);
        emit PayoutClaimed(msg.sender, netPayout);
    }

    function withdrawFees() external nonReentrant {
        if (msg.sender != feeTreasury && msg.sender != governance) {
            revert OnlyGovernance();
        }

        uint256 amount = accruedFees;
        if (amount == 0) revert ZeroAmount();
        accruedFees = 0;

        collateralToken.safeTransfer(feeTreasury, amount);
        emit FeesWithdrawn(feeTreasury, amount);
    }

    /*//////////////////////////////////////////////////////////////
                          VIEW HELPERS
    //////////////////////////////////////////////////////////////*/

    function getTotals() external view returns (uint256 yes, uint256 no) {
        return (totalYes, totalNo);
    }

    function getUserPosition(address user)
        external
        view
        returns (uint256 yes, uint256 no)
    {
        return (yesBets[user], noBets[user]);
    }
}
