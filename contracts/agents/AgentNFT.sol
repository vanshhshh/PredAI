// File: contracts/agents/AgentNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    AgentNFT.sol

    PURPOSE
    -------
    ERC-721 representation of AI agent ownership.
    This contract provides:
    - verifiable ownership of agents
    - transferable economic rights
    - immutable linkage to agent identity
    - compatibility with secondary markets

    IMPORTANT DESIGN CHOICES
    ------------------------
    - Ownership ≠ authority
    - Ownership does NOT bypass slashing
    - Ownership does NOT grant protocol privileges
    - Agent behavior remains constrained by other contracts

    GUARANTEES (from docs)
    ---------------------
    - Non-custodial ownership
    - Transparent, on-chain provenance
    - Separation of control and incentives

    TRUST MODEL
    -----------
    - NFT holders are untrusted
    - Agent behavior is adversarial
    - Governance remains bounded
*/

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AgentRegistry} from "./AgentRegistry.sol";

contract AgentNFT is ERC721 {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyGovernance();
    error AgentNotRegistered();
    error NFTAlreadyMinted();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event AgentNFTMinted(
        address indexed agent,
        address indexed owner,
        uint256 tokenId
    );

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Governance authority
    address public governance;

    /// @notice Agent registry
    AgentRegistry public immutable agentRegistry;

    /// @notice Agent address => tokenId
    mapping(address => uint256) public agentTokenIds;

    /// @notice Next token ID
    uint256 private nextTokenId;

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

    constructor(
        address _governance,
        address _agentRegistry
    ) ERC721("AI Agent", "AIA") {
        require(_governance != address(0), "INVALID_GOVERNANCE");
        require(_agentRegistry != address(0), "INVALID_REGISTRY");

        governance = _governance;
        agentRegistry = AgentRegistry(_agentRegistry);
        nextTokenId = 1;
    }

    /*//////////////////////////////////////////////////////////////
                        MINTING LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Mint an NFT representing ownership of an agent
     * @dev Minting is governance-gated to prevent spoofing
     */
    function mintAgentNFT(address agent, address owner)
        external
        onlyGovernance
        returns (uint256 tokenId)
    {
        if (agentTokenIds[agent] != 0) revert NFTAlreadyMinted();

        // Will revert internally if agent is not registered
        agentRegistry.getAgent(agent);

        tokenId = nextTokenId++;
        agentTokenIds[agent] = tokenId;

        _mint(owner, tokenId);

        emit AgentNFTMinted(agent, owner, tokenId);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getTokenIdForAgent(address agent)
        external
        view
        returns (uint256)
    {
        uint256 tokenId = agentTokenIds[agent];
        if (tokenId == 0) revert AgentNotRegistered();
        return tokenId;
    }
}
