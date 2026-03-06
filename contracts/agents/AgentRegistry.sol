// File: contracts/agents/AgentRegistry.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    AgentRegistry.sol

    PURPOSE
    -------
    Canonical registry for AI agents acting as first-class economic participants.
    This contract enforces:
    - explicit agent identity
    - stake-gated activation
    - immutable metadata references
    - governance-bounded controls

    GUARANTEES (from docs)
    ---------------------
    - No anonymous influence
    - No action without stake
    - Deterministic, on-chain accountability
    - Non-custodial (no fund seizure)

    TRUST MODEL
    -----------
    - Agents are adversarial by default
    - Governance is slow, bounded, auditable
*/

contract AgentRegistry {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyGovernance();
    error AgentAlreadyRegistered();
    error AgentNotRegistered();
    error AgentInactive();
    error AgentStillActive();
    error InvalidMetadata();
    error InvalidStake();
    error InsufficientStake();
    error TransferFailed();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event AgentRegistered(
        address indexed agent,
        bytes32 indexed agentId,
        string metadataURI
    );

    event AgentActivated(address indexed agent);
    event AgentDeactivated(address indexed agent);
    event AgentStakeWithdrawn(address indexed agent, uint256 amount);

    event MinimumStakeUpdated(uint256 newMinimumStake);

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Governance authority
    address public governance;

    /// @notice Minimum stake required for activation
    uint256 public minimumStake;

    struct Agent {
        bytes32 agentId;
        string metadataURI;
        uint256 stake;
        bool active;
        bool exists;
    }

    /// @notice Agent address => Agent data
    mapping(address => Agent) private agents;

    /// @notice Total registered agents
    uint256 public totalAgents;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyGovernance() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    modifier onlyActiveAgent(address agent) {
        if (!agents[agent].active) revert AgentInactive();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _governance, uint256 _minimumStake) {
        require(_governance != address(0), "INVALID_GOVERNANCE");
        governance = _governance;
        minimumStake = _minimumStake;
    }

    /*//////////////////////////////////////////////////////////////
                        GOVERNANCE CONTROLS
    //////////////////////////////////////////////////////////////*/

    function updateMinimumStake(uint256 newMinimumStake)
        external
        onlyGovernance
    {
        minimumStake = newMinimumStake;
        emit MinimumStakeUpdated(newMinimumStake);
    }

    /*//////////////////////////////////////////////////////////////
                        REGISTRATION LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Register a new AI agent
     * @param agentId Deterministic identifier (e.g., model hash)
     * @param metadataURI IPFS/Arweave reference describing agent
     */
    function registerAgent(bytes32 agentId, string calldata metadataURI)
        external
    {
        if (agents[msg.sender].exists) revert AgentAlreadyRegistered();
        if (bytes(metadataURI).length == 0) revert InvalidMetadata();

        agents[msg.sender] = Agent({
            agentId: agentId,
            metadataURI: metadataURI,
            stake: 0,
            active: false,
            exists: true
        });

        totalAgents += 1;

        emit AgentRegistered(msg.sender, agentId, metadataURI);
    }

    /*//////////////////////////////////////////////////////////////
                        STAKING & ACTIVATION
    //////////////////////////////////////////////////////////////*/

    function stakeAndActivate() external payable {
        Agent storage agent = agents[msg.sender];
        if (!agent.exists) revert AgentNotRegistered();
        if (msg.value == 0) revert InvalidStake();

        agent.stake += msg.value;

        if (agent.stake >= minimumStake && !agent.active) {
            agent.active = true;
            emit AgentActivated(msg.sender);
        }
    }

    function deactivate() external {
        Agent storage agent = agents[msg.sender];
        if (!agent.exists) revert AgentNotRegistered();
        if (!agent.active) revert AgentInactive();

        agent.active = false;
        emit AgentDeactivated(msg.sender);
    }

    /**
     * @notice Withdraw stake after deactivation.
     * @dev Keeps stake accounting and custody in the same contract as activation logic.
     */
    function unstake(uint256 amount) external {
        Agent storage agent = agents[msg.sender];
        if (!agent.exists) revert AgentNotRegistered();
        if (agent.active) revert AgentStillActive();
        if (amount == 0 || amount > agent.stake) revert InsufficientStake();

        agent.stake -= amount;

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit AgentStakeWithdrawn(msg.sender, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getAgent(address agent)
        external
        view
        returns (
            bytes32 agentId,
            string memory metadataURI,
            uint256 stake,
            bool active
        )
    {
        Agent storage a = agents[agent];
        if (!a.exists) revert AgentNotRegistered();
        return (a.agentId, a.metadataURI, a.stake, a.active);
    }

    function isActiveAgent(address agent) external view returns (bool) {
        return agents[agent].active;
    }
}
