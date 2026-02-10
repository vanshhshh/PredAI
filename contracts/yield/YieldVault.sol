// File: contracts/yield/YieldVault.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    YieldVault.sol

    PURPOSE
    -------
    Canonical yield vault interface implementation.
    This contract:
    - accepts routed idle capital
    - deploys capital into an underlying strategy
    - guarantees deterministic withdrawal paths
    - exposes transparent accounting

    GUARANTEES (from docs)
    ---------------------
    - No leverage
    - No rehypothecation
    - Deterministic exit
    - Settlement priority respected
    - Governance-bounded configuration

    TRUST MODEL
    -----------
    - Strategy logic is semi-trusted
    - Vault itself enforces safety invariants
*/

contract YieldVault {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyRouter();
    error OnlyGovernance();
    error ZeroAmount();
    error InsufficientBalance();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);
    event YieldAccrued(uint256 amount);

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    address public governance;
    address public capitalRouter;

    /// @notice Total capital managed by vault
    uint256 public totalBalance;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyRouter() {
        if (msg.sender != capitalRouter) revert OnlyRouter();
        _;
    }

    modifier onlyGovernance() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _governance, address _capitalRouter) {
        require(_governance != address(0), "INVALID_GOVERNANCE");
        require(_capitalRouter != address(0), "INVALID_ROUTER");

        governance = _governance;
        capitalRouter = _capitalRouter;
    }

    /*//////////////////////////////////////////////////////////////
                        VAULT OPERATIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Deposit routed capital
     * @dev Callable only by CapitalRouter
     */
    function deposit() external payable onlyRouter {
        if (msg.value == 0) revert ZeroAmount();

        totalBalance += msg.value;

        emit Deposited(msg.sender, msg.value);

        // Strategy hook (no-op by default)
        _deploy(msg.value);
    }

    /**
     * @notice Withdraw capital back to router
     * @dev Must always succeed for settlement priority
     */
    function withdraw(uint256 amount) external onlyRouter {
        if (amount == 0) revert ZeroAmount();
        if (amount > totalBalance) revert InsufficientBalance();

        totalBalance -= amount;

        _unwind(amount);

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "TRANSFER_FAILED");

        emit Withdrawn(msg.sender, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        STRATEGY HOOKS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Deploy capital into strategy
     * Override in derived vaults
     */
    function _deploy(uint256 amount) internal virtual {
        amount;
    }

    /**
     * @dev Unwind capital from strategy
     * Override in derived vaults
     */
    function _unwind(uint256 amount) internal virtual {
        amount;
    }

    /*//////////////////////////////////////////////////////////////
                        EMERGENCY CONTROLS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Emergency withdraw all funds
     * @dev Governance only, last-resort
     */
    function emergencyWithdrawAll(address to)
        external
        onlyGovernance
    {
        uint256 balance = totalBalance;
        totalBalance = 0;

        _unwind(balance);

        (bool ok, ) = to.call{value: balance}("");
        require(ok, "TRANSFER_FAILED");

        emit Withdrawn(to, balance);
    }
}
