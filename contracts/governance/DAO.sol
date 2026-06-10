// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVotesToken {
    function getPastVotes(address account, uint256 timepoint)
        external
        view
        returns (uint256);
}

interface IGovernanceTimelock {
    function queue(address target, bytes calldata data, uint256 delay)
        external
        returns (bytes32 actionId);

    function execute(address target, bytes calldata data, bytes32 actionId)
        external;
}

contract DAO {
    error ProposalNotFound();
    error VotingNotStarted();
    error VotingEnded();
    error AlreadyVoted();
    error QuorumNotMet();
    error ProposalRejected();
    error ExecutionNotReady();
    error InvalidAction();
    error NoVotingPower();
    error ProposalAlreadyQueued();
    error ProposalAlreadyExecuted();
    error ProposalThresholdNotMet();
    error TimelockActionMismatch();

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address indexed target,
        bytes32 dataHash,
        string description
    );

    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );

    event ProposalQueued(
        uint256 indexed proposalId,
        bytes32 indexed actionId,
        uint256 executeAfter
    );

    event ProposalExecuted(uint256 indexed proposalId, bytes32 indexed actionId);

    address public immutable executor;
    IVotesToken public immutable votingToken;

    uint256 public immutable votingDelay;
    uint256 public immutable votingPeriod;
    uint256 public immutable quorum;
    uint256 public immutable proposalThreshold;

    uint256 private nextProposalId;

    struct Proposal {
        address proposer;
        address target;
        bytes data;
        string description;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        bool queued;
        bool executed;
        uint256 executeAfter;
        bytes32 actionId;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    constructor(
        address _executor,
        address _votingToken,
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _quorum,
        uint256 _proposalThreshold
    ) {
        require(_executor != address(0), "INVALID_EXECUTOR");
        require(_votingToken != address(0), "INVALID_TOKEN");
        require(_votingPeriod > 0, "INVALID_PERIOD");

        executor = _executor;
        votingToken = IVotesToken(_votingToken);
        votingDelay = _votingDelay;
        votingPeriod = _votingPeriod;
        quorum = _quorum;
        proposalThreshold = _proposalThreshold;
        nextProposalId = 1;
    }

    function createProposal(
        address target,
        bytes calldata data,
        string calldata description
    ) external returns (uint256 proposalId) {
        if (target == address(0) || data.length == 0) revert InvalidAction();
        if (bytes(description).length == 0) revert InvalidAction();
        if (_pastVotes(msg.sender, block.number - 1) < proposalThreshold) {
            revert ProposalThresholdNotMet();
        }

        proposalId = nextProposalId++;

        proposals[proposalId] = Proposal({
            proposer: msg.sender,
            target: target,
            data: data,
            description: description,
            startBlock: block.number + votingDelay,
            endBlock: block.number + votingDelay + votingPeriod,
            forVotes: 0,
            againstVotes: 0,
            queued: false,
            executed: false,
            executeAfter: 0,
            actionId: bytes32(0)
        });

        emit ProposalCreated(
            proposalId,
            msg.sender,
            target,
            keccak256(data),
            description
        );
    }

    function noop() external {}

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        if (p.proposer == address(0)) revert ProposalNotFound();
        if (block.number < p.startBlock) revert VotingNotStarted();
        if (block.number > p.endBlock) revert VotingEnded();
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

        uint256 weight = _pastVotes(msg.sender, p.startBlock);
        if (weight < 1) revert NoVotingPower();

        hasVoted[proposalId][msg.sender] = true;
        if (support) {
            p.forVotes += weight;
        } else {
            p.againstVotes += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    function queueProposal(uint256 proposalId, uint256 delay) external {
        Proposal storage p = proposals[proposalId];
        if (p.proposer == address(0)) revert ProposalNotFound();
        if (block.number <= p.endBlock) revert VotingEnded();
        if (p.queued) revert ProposalAlreadyQueued();
        if (p.executed) revert ProposalAlreadyExecuted();
        if (p.forVotes < quorum) revert QuorumNotMet();
        if (p.forVotes <= p.againstVotes) revert ProposalRejected();

        bytes32 expectedActionId = keccak256(
            abi.encode(p.target, p.data, block.timestamp)
        );
        uint256 executeAfter = block.timestamp + delay;

        p.queued = true;
        p.actionId = expectedActionId;
        p.executeAfter = executeAfter;

        bytes32 actionId = IGovernanceTimelock(executor).queue(
            p.target,
            p.data,
            delay
        );
        if (actionId != expectedActionId) revert TimelockActionMismatch();

        emit ProposalQueued(proposalId, expectedActionId, executeAfter);
    }

    function executeProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        if (p.proposer == address(0)) revert ProposalNotFound();
        if (!p.queued || uint256(p.actionId) < 1) revert ExecutionNotReady();
        if (p.executed) revert ProposalAlreadyExecuted();
        if (block.timestamp < p.executeAfter) revert ExecutionNotReady();

        p.executed = true;
        IGovernanceTimelock(executor).execute(p.target, p.data, p.actionId);

        emit ProposalExecuted(proposalId, p.actionId);
    }

    function getProposal(uint256 proposalId)
        external
        view
        returns (
            address proposer,
            address target,
            bytes memory data,
            string memory description,
            uint256 startBlock,
            uint256 endBlock,
            uint256 forVotes,
            uint256 againstVotes,
            bool queued,
            bool executed,
            uint256 executeAfter,
            bytes32 actionId
        )
    {
        Proposal storage p = proposals[proposalId];
        if (p.proposer == address(0)) revert ProposalNotFound();

        return (
            p.proposer,
            p.target,
            p.data,
            p.description,
            p.startBlock,
            p.endBlock,
            p.forVotes,
            p.againstVotes,
            p.queued,
            p.executed,
            p.executeAfter,
            p.actionId
        );
    }

    function _pastVotes(address account, uint256 timepoint)
        internal
        view
        returns (uint256)
    {
        return votingToken.getPastVotes(account, timepoint);
    }
}
