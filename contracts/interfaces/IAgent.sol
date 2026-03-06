// File: contracts/interfaces/IAgent.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    IAgent.sol

    PURPOSE
    -------
    Canonical interface for AI agents participating in the protocol.

    This interface defines the minimum on-chain surface area
    required for any agent to:
    - be registered
    - be scored
    - be staked
    - interact with markets

    DESIGN RULES (from docs)
    ------------------------
    - Agents are economically accountable
    - Agents have no special privileges
    - Agents act under bounded permissions
    - Agent identity is immutable once registered
*/

interface IAgent {
    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event AgentRegistered(address indexed agent, bytes32 agentId);
    event AgentActivated(address indexed agent);
    event AgentDeactivated(address indexed agent);

    /*//////////////////////////////////////////////////////////////
                                VIEW
    //////////////////////////////////////////////////////////////*/

    function agentId() external view returns (bytes32);
    function metadataURI() external view returns (string memory);
    function stake() external view returns (uint256);
    function active() external view returns (bool);

    /*//////////////////////////////////////////////////////////////
                            CORE ACTIONS
    //////////////////////////////////////////////////////////////*/

    function register(bytes32 agentId, string calldata metadataURI) external;
    function stakeAndActivate() external payable;
    function deactivate() external;
    function unstake(uint256 amount) external;
}
