// File: contracts/core/PredictionMarket.sol
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

contract PredictionMarket {
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
    error TransferFailed();
    error OnlyGovernance();

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

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    bytes32 public immutable marketId;
    address public immutable creator;
    address public immutable governance;

    uint256 public immutable startTime;
    uint256 public immutable endTime;
    uint256 public immutable maxExposure;

    bool public settled;
    bool public finalOutcome;

    uint256 public totalYes;
    uint256 public totalNo;

    mapping(address => uint256) public yesBets;
    mapping(address => uint256) public noBets;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyGovernance() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    modifier marketOpen() {
        if (block.timestamp < startTime) revert MarketNotOpen();
        if (block.timestamp >= endTime) revert MarketClosed();
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
        address _governance
    ) {
        require(_creator != address(0), "INVALID_CREATOR");
        require(_governance != address(0), "INVALID_GOVERNANCE");
        require(_endTime > _startTime, "INVALID_TIME");

        marketId = _marketId;
        creator = _creator;
        startTime = _startTime;
        endTime = _endTime;
        maxExposure = _maxExposure;
        governance = _governance;
    }

    /*//////////////////////////////////////////////////////////////
                          BETTING LOGIC
    //////////////////////////////////////////////////////////////*/

    function betYes() external payable marketOpen notSettled {
        _placeBet(true, msg.value);
    }

    function betNo() external payable marketOpen notSettled {
        _placeBet(false, msg.value);
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

        emit BetPlaced(msg.sender, outcome, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        SETTLEMENT LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Settle the market with final outcome
     * @dev Called by governance-controlled settlement engine
     */
    function settle(bool outcome) external onlyGovernance notSettled {
        settled = true;
        finalOutcome = outcome;

        emit MarketSettled(outcome, totalYes, totalNo);
    }

    /*//////////////////////////////////////////////////////////////
                          CLAIM LOGIC
    //////////////////////////////////////////////////////////////*/

    function claim() external {
        if (!settled) revert MarketNotSettled();

        uint256 payout;
        uint256 pool = totalYes + totalNo;

        if (finalOutcome) {
            uint256 stake = yesBets[msg.sender];
            if (stake == 0) revert ZeroAmount();
            yesBets[msg.sender] = 0;
            payout = (stake * pool) / totalYes;
        } else {
            uint256 stake = noBets[msg.sender];
            if (stake == 0) revert ZeroAmount();
            noBets[msg.sender] = 0;
            payout = (stake * pool) / totalNo;
        }

        (bool ok, ) = msg.sender.call{value: payout}("");
        if (!ok) revert TransferFailed();

        emit PayoutClaimed(msg.sender, payout);
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
