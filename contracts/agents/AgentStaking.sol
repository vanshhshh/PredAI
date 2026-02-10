// File: contracts/agents/AgentStaking.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    AgentStaking.sol

    PURPOSE
    -------
    Dedicated staking and slashing contract for AI agents.
    Separates:
    - identity (AgentRegistry)
    - staking economics
    - slashing execution

    This separation ensures:
    - clear economic accounting
    - auditable slashing
    - non-custodial guarantees
    - minimal trust surface

    GUARANTEES (from docs)
    ---------------------
    - No stake → no influence
    - Slashing is deterministic and attributable
    - Governance-bounded execution
    - No silent confiscation

    TRUST MODEL
    -----------
    - Agents are adversarial
    - Slashing authority is constrained
    - Governance is slow and auditable
*/

import {AgentRegistry} from "./AgentRegistry.sol";

contract AgentStaking {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyGovernance();
    error AgentNotActive();
    error InvalidSlashAmount();
    error InsufficientStake();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event StakeAdded(address indexed agent, uint256 amount);
    event StakeSlashed(address indexed agent, uint256 amount);
    event StakeWithdrawn(address indexed agent, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Governance authority
    address public governance;

    /// @notice Agent registry
    AgentRegistry public immutable agentRegistry;

    /// @notice Agent address => staked balance
    mapping(address => uint256) public stakes;

    /// @notice Total stake locked by all agents
    uint256 public totalStaked;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyGovernance() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    modifier onlyActiveAgent(address agent) {
        if (!agentRegistry.isActiveAgent(agent)) revert AgentNotActive();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _governance, address _agentRegistry) {
        require(_governance != address(0), "INVALID_GOVERNANCE");
        require(_agentRegistry != address(0), "INVALID_REGISTRY");

        governance = _governance;
        agentRegistry = AgentRegistry(_agentRegistry);
    }

    /*//////////////////////////////////////////////////////////////
                        STAKING LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Add stake to an active agent
     * @dev Funds are locked and slashable
     */
    function stake() external payable onlyActiveAgent(msg.sender) {
        if (msg.value == 0) revert InvalidSlashAmount();

        stakes[msg.sender] += msg.value;
        totalStaked += msg.value;

        emit StakeAdded(msg.sender, msg.value);
    }

    /*//////////////////////////////////////////////////////////////
                        SLASHING LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Slash an agent's stake
     * @dev Callable only by governance or authorized slashing engine
     */
    function slash(address agent, uint256 amount)
        external
        onlyGovernance
    {
        uint256 currentStake = stakes[agent];
        if (amount == 0 || amount > currentStake) revert InvalidSlashAmount();

        stakes[agent] = currentStake - amount;
        totalStaked -= amount;

        // Slashed funds are burned by default
        // Governance may redirect in future upgrades

        emit StakeSlashed(agent, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        WITHDRAWAL LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Withdraw stake after deactivation
     * @dev Enforces non-custodial guarantees
     */
    function withdraw(uint256 amount) external {
        if (agentRegistry.isActiveAgent(msg.sender)) revert AgentNotActive();
        uint256 currentStake = stakes[msg.sender];
        if (amount == 0 || amount > currentStake) revert InsufficientStake();

        stakes[msg.sender] = currentStake - amount;
        totalStaked -= amount;

        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "TRANSFER_FAILED");

        emit StakeWithdrawn(msg.sender, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getStake(address agent) external view returns (uint256) {
        return stakes[agent];
    }
}
