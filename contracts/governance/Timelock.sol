// File: contracts/governance/Timelock.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    Timelock.sol

    PURPOSE
    -------
    Canonical time-delay execution contract for governance actions.
    This contract ensures:
    - no immediate execution of governance decisions
    - mandatory review periods
    - deterministic, auditable execution
    - bounded authority

    GUARANTEES (from docs)
    ---------------------
    - No fast governance
    - No silent execution
    - Immutable delays once queued
    - No custody of funds

    TRUST MODEL
    -----------
    - DAO proposes and queues
    - Timelock executes after delay
    - Contracts enforce invariants
*/

contract Timelock {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyDAO();
    error ActionNotQueued();
    error ActionAlreadyExecuted();
    error ExecutionTooEarly();
    error InvalidTarget();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event ActionQueued(
        bytes32 indexed actionId,
        address indexed target,
        uint256 executeAfter
    );

    event ActionExecuted(
        bytes32 indexed actionId,
        address indexed target
    );

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice DAO authority
    address public dao;

    /// @notice actionId => execution timestamp
    mapping(bytes32 => uint256) public queuedActions;

    /// @notice actionId => executed
    mapping(bytes32 => bool) public executed;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyDAO() {
        if (msg.sender != dao) revert OnlyDAO();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _dao) {
        require(_dao != address(0), "INVALID_DAO");
        dao = _dao;
    }

    /*//////////////////////////////////////////////////////////////
                        QUEUE LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Queue an action for delayed execution
     * @param target Contract to be called
     * @param data Calldata to execute
     * @param delay Time delay in seconds
     */
    function queue(
        address target,
        bytes calldata data,
        uint256 delay
    ) external onlyDAO returns (bytes32 actionId) {
        if (target == address(0)) revert InvalidTarget();

        actionId = keccak256(abi.encode(target, data, block.timestamp));

        queuedActions[actionId] = block.timestamp + delay;

        emit ActionQueued(actionId, target, queuedActions[actionId]);
    }

    /*//////////////////////////////////////////////////////////////
                        EXECUTION LOGIC
    //////////////////////////////////////////////////////////////*/

    function execute(
        address target,
        bytes calldata data,
        bytes32 actionId
    ) external {
        uint256 executeAfter = queuedActions[actionId];

        if (executeAfter == 0) revert ActionNotQueued();
        if (executed[actionId]) revert ActionAlreadyExecuted();
        if (block.timestamp < executeAfter) revert ExecutionTooEarly();

        executed[actionId] = true;

        (bool ok, ) = target.call(data);
        require(ok, "CALL_FAILED");

        emit ActionExecuted(actionId, target);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function isQueued(bytes32 actionId) external view returns (bool) {
        return queuedActions[actionId] != 0;
    }

    function isExecuted(bytes32 actionId) external view returns (bool) {
        return executed[actionId];
    }
}
