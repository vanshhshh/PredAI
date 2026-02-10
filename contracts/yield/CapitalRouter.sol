// File: contracts/yield/CapitalRouter.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    CapitalRouter.sol

    PURPOSE
    -------
    Canonical capital routing coordinator for idle funds.
    This contract:
    - routes ONLY idle capital
    - enforces risk and exposure bounds
    - guarantees settlement priority
    - acts as a thin on-chain executor

    GUARANTEES (from docs)
    ---------------------
    - Settlement > Yield
    - No leverage
    - Deterministic exits
    - Governance-bounded strategy approval
    - No custody beyond vault execution

    TRUST MODEL
    -----------
    - Yield strategies are semi-trusted
    - Governance approves but cannot seize funds
*/

import {YieldVault} from "./YieldVault.sol";

contract CapitalRouter {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyGovernance();
    error StrategyNotApproved();
    error ExposureCapExceeded();
    error ZeroAmount();
    error InvalidVault();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event StrategyApproved(address indexed vault, bool approved);
    event CapitalRouted(address indexed vault, uint256 amount);
    event CapitalWithdrawn(address indexed vault, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    address public governance;

    /// @notice Approved yield vaults
    mapping(address => bool) public approvedVaults;

    /// @notice Vault => total routed capital
    mapping(address => uint256) public vaultExposure;

    /// @notice Maximum exposure per vault
    uint256 public maxVaultExposure;

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

    constructor(address _governance, uint256 _maxVaultExposure) {
        require(_governance != address(0), "INVALID_GOVERNANCE");
        governance = _governance;
        maxVaultExposure = _maxVaultExposure;
    }

    /*//////////////////////////////////////////////////////////////
                        GOVERNANCE CONTROLS
    //////////////////////////////////////////////////////////////*/

    function approveVault(address vault, bool approved)
        external
        onlyGovernance
    {
        if (vault == address(0)) revert InvalidVault();
        approvedVaults[vault] = approved;
        emit StrategyApproved(vault, approved);
    }

    function updateMaxVaultExposure(uint256 newMax)
        external
        onlyGovernance
    {
        maxVaultExposure = newMax;
    }

    /*//////////////////////////////////////////////////////////////
                        ROUTING LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Route idle capital into a yield vault
     * @dev Capital must be explicitly sent with tx
     */
    function routeCapital(address vault)
        external
        payable
    {
        if (!approvedVaults[vault]) revert StrategyNotApproved();
        if (msg.value == 0) revert ZeroAmount();

        uint256 newExposure =
            vaultExposure[vault] + msg.value;

        if (newExposure > maxVaultExposure)
            revert ExposureCapExceeded();

        vaultExposure[vault] = newExposure;

        YieldVault(vault).deposit{value: msg.value}();

        emit CapitalRouted(vault, msg.value);
    }

    /**
     * @notice Withdraw capital from a yield vault
     * @dev Callable only by governance for rebalancing or settlement
     */
    function withdrawCapital(address vault, uint256 amount)
        external
        onlyGovernance
    {
        if (!approvedVaults[vault]) revert StrategyNotApproved();
        if (amount == 0) revert ZeroAmount();

        vaultExposure[vault] -= amount;

        YieldVault(vault).withdraw(amount);

        emit CapitalWithdrawn(vault, amount);
    }
}
