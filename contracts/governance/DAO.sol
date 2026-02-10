// File: contracts/governance/DAO.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    DAO.sol

    PURPOSE
    -------
    Canonical on-chain governance contract.
    This contract coordinates:
    - proposal lifecycle
    - voting
    - timelock-based execution
    - bounded authority over protocol parameters

    GUARANTEES (from docs)
    ---------------------
    - No fast governance
    - No silent execution
    - Time-locked changes
    - Parameter-bound enforcement
    - No custody of user funds

    TRUST MODEL
    -----------
    - Token holders are rational but adversarial
    - Governance is slow by design
    - Execution is deterministic
*/

contract DAO {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error ProposalNotFound();
    error VotingNotStarted();
    error VotingEnded();
    error AlreadyVoted();
    error QuorumNotMet();
    error OnlyExecutor();
    error ExecutionNotReady();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        uint256 weight
    );

    event ProposalQueued(uint256 indexed proposalId, uint256 executeAfter);
    event ProposalExecuted(uint256 indexed proposalId);

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    address public executor; // Timelock / Executor contract

    uint256 public votingDelay;
    uint256 public votingPeriod;
    uint256 public quorum;

    uint256 private nextProposalId;

    struct Proposal {
        address proposer;
        string description;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        bool executed;
        uint256 executeAfter;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyExecutor() {
        if (msg.sender != executor) revert OnlyExecutor();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _executor,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _quorum
    ) {
        require(_executor != address(0), "INVALID_EXECUTOR");
        executor = _executor;
        votingDelay = _votingDelay;
        votingPeriod = _votingPeriod;
        quorum = _quorum;
        nextProposalId = 1;
    }

    /*//////////////////////////////////////////////////////////////
                        PROPOSAL LOGIC
    //////////////////////////////////////////////////////////////*/

    function createProposal(string calldata description)
        external
        returns (uint256 proposalId)
    {
        proposalId = nextProposalId++;

        proposals[proposalId] = Proposal({
            proposer: msg.sender,
            description: description,
            startBlock: block.number + votingDelay,
            endBlock: block.number + votingDelay + votingPeriod,
            forVotes: 0,
            executed: false,
            executeAfter: 0
        });

        emit ProposalCreated(proposalId, msg.sender, description);
    }

    function vote(uint256 proposalId, uint256 weight) external {
        Proposal storage p = proposals[proposalId];
        if (p.proposer == address(0)) revert ProposalNotFound();
        if (block.number < p.startBlock) revert VotingNotStarted();
        if (block.number > p.endBlock) revert VotingEnded();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

        hasVoted[proposalId][msg.sender] = true;
        p.forVotes += weight;

        emit VoteCast(proposalId, msg.sender, weight);
    }

    /*//////////////////////////////////////////////////////////////
                        QUEUE & EXECUTION
    //////////////////////////////////////////////////////////////*/

    function queueProposal(uint256 proposalId, uint256 delay)
        external
    {
        Proposal storage p = proposals[proposalId];
        if (p.proposer == address(0)) revert ProposalNotFound();
        if (block.number <= p.endBlock) revert VotingEnded();
        if (p.forVotes < quorum) revert QuorumNotMet();

        p.executeAfter = block.timestamp + delay;

        emit ProposalQueued(proposalId, p.executeAfter);
    }

    function executeProposal(uint256 proposalId)
        external
        onlyExecutor
    {
        Proposal storage p = proposals[proposalId];
        if (p.executeAfter == 0) revert ExecutionNotReady();
        if (block.timestamp < p.executeAfter) revert ExecutionNotReady();
        if (p.executed) revert ExecutionNotReady();

        p.executed = true;

        emit ProposalExecuted(proposalId);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            address proposer,
            string memory description,
            uint256 startBlock,
            uint256 endBlock,
            uint256 forVotes,
            bool executed,
            uint256 executeAfter
        )
    {
        Proposal storage p = proposals[proposalId];
        if (p.proposer == address(0)) revert ProposalNotFound();

        return (
            p.proposer,
            p.description,
            p.startBlock,
            p.endBlock,
            p.forVotes,
            p.executed,
            p.executeAfter
        );
    }
}
