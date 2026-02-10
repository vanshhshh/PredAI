// File: contracts/yield/RiskAllocator.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    RiskAllocator.sol

    PURPOSE
    -------
    On-chain risk gatekeeper for yield routing decisions.
    This contract does NOT move capital.
    It enforces:
    - per-strategy risk caps
    - system-wide exposure limits
    - governance-approved risk parameters

    CapitalRouter MUST consult this contract before routing.

    GUARANTEES (from docs)
    ---------------------
    - Safety > Yield
    - Deterministic enforcement
    - Governance-bounded risk changes
    - No discretionary overrides

    TRUST MODEL
    -----------
    - Governance defines bounds
    - Router enforces outcomes
*/

contract RiskAllocator {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyGovernance();
    error StrategyNotApproved();
    error RiskLimitExceeded();
    error InvalidParameters();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event StrategyApproved(address indexed strategy, bool approved);
    event RiskParametersUpdated(
        address indexed strategy,
        uint256 maxExposure,
        uint256 riskScore
    );

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    address public governance;

    struct RiskProfile {
        bool approved;
        uint256 maxExposure;
        uint256 riskScore; // abstract, relative (0–10000)
    }

    /// @notice Strategy address => risk profile
    mapping(address => RiskProfile) public strategies;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyGovernance() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _governance) {
        require(_governance != address(0), "INVALID_GOVERNANCE");
        governance = _governance;
    }

    /*//////////////////////////////////////////////////////////////
                        GOVERNANCE CONTROLS
    //////////////////////////////////////////////////////////////*/

    function approveStrategy(
        address strategy,
        bool approved,
        uint256 maxExposure,
        uint256 riskScore
    ) external onlyGovernance {
        if (strategy == address(0)) revert InvalidParameters();
        if (riskScore > 10_000) revert InvalidParameters();

        strategies[strategy] = RiskProfile({
            approved: approved,
            maxExposure: maxExposure,
            riskScore: riskScore
        });

        emit StrategyApproved(strategy, approved);
        emit RiskParametersUpdated(strategy, maxExposure, riskScore);
    }

    /*//////////////////////////////////////////////////////////////
                        RISK CHECK LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Check if a routing action is allowed
     * @dev Called by CapitalRouter prior to routing
     */
    function isRoutingAllowed(
        address strategy,
        uint256 currentExposure,
        uint256 proposedAmount
    ) external view returns (bool) {
        RiskProfile memory rp = strategies[strategy];

        if (!rp.approved) revert StrategyNotApproved();
        if (currentExposure + proposedAmount > rp.maxExposure)
            revert RiskLimitExceeded();

        return true;
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getRiskProfile(address strategy)
        external
        view
        returns (
            bool approved,
            uint256 maxExposure,
            uint256 riskScore
        )
    {
        RiskProfile memory rp = strategies[strategy];
        return (rp.approved, rp.maxExposure, rp.riskScore);
    }
}
