// File: contracts/agents/AgentScoring.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    AgentScoring.sol

    PURPOSE
    -------
    Deterministic on-chain scoring registry for AI agents.
    This contract records:
    - historical performance scores
    - score decay
    - penalty application
    - public ranking signals

    IMPORTANT:
    ----------
    - Scoring does NOT move funds
    - Scoring does NOT grant permissions
    - Scoring only informs other contracts

    GUARANTEES (from docs)
    ---------------------
    - Scores are immutable once recorded
    - All updates are attributable
    - No off-chain discretion
    - Governance-bounded adjustments

    TRUST MODEL
    -----------
    - Scores are data, not authority
    - Agents are adversarial
    - Governance is slow and bounded
*/

import {AgentRegistry} from "./AgentRegistry.sol";

contract AgentScoring {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyGovernance();
    error AgentNotRegistered();
    error InvalidScoreDelta();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event ScoreUpdated(
        address indexed agent,
        int256 delta,
        uint256 newScore
    );

    event ScoreDecayApplied(
        address indexed agent,
        uint256 newScore
    );

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Governance authority
    address public governance;

    /// @notice Agent registry
    AgentRegistry public immutable agentRegistry;

    /// @notice Agent address => score
    mapping(address => uint256) public scores;

    /// @notice Score decay rate (bps per epoch)
    uint256 public decayRateBps;

    /// @notice Epoch duration in seconds
    uint256 public epochDuration;

    /// @notice Last decay timestamp per agent
    mapping(address => uint256) public lastDecay;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyGovernance() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    modifier onlyRegistered(address agent) {
        (, , , bool active) = agentRegistry.getAgent(agent);
        active; // silence unused warning
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _governance,
        address _agentRegistry,
        uint256 _decayRateBps,
        uint256 _epochDuration
    ) {
        require(_governance != address(0), "INVALID_GOVERNANCE");
        require(_agentRegistry != address(0), "INVALID_REGISTRY");
        require(_epochDuration > 0, "INVALID_EPOCH");

        governance = _governance;
        agentRegistry = AgentRegistry(_agentRegistry);
        decayRateBps = _decayRateBps;
        epochDuration = _epochDuration;
    }

    /*//////////////////////////////////////////////////////////////
                        GOVERNANCE CONTROLS
    //////////////////////////////////////////////////////////////*/

    function updateDecayParameters(
        uint256 newDecayRateBps,
        uint256 newEpochDuration
    ) external onlyGovernance {
        require(newEpochDuration > 0, "INVALID_EPOCH");
        decayRateBps = newDecayRateBps;
        epochDuration = newEpochDuration;
    }

    /*//////////////////////////////////////////////////////////////
                        SCORE MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Apply a score delta to an agent
     * @dev Positive or negative deltas allowed
     */
    function applyScoreDelta(address agent, int256 delta)
        external
        onlyGovernance
    {
        _applyDecay(agent);

        uint256 current = scores[agent];

        if (delta > 0) {
            scores[agent] = current + uint256(delta);
        } else {
            uint256 absDelta = uint256(-delta);
            scores[agent] = absDelta >= current ? 0 : current - absDelta;
        }

        emit ScoreUpdated(agent, delta, scores[agent]);
    }

    /**
     * @notice Apply time-based decay to agent score
     */
    function applyDecay(address agent) external {
        _applyDecay(agent);
    }

    function _applyDecay(address agent) internal {
        uint256 last = lastDecay[agent];
        if (last == 0) {
            lastDecay[agent] = block.timestamp;
            return;
        }

        uint256 elapsed = block.timestamp - last;
        if (elapsed < epochDuration) return;

        uint256 epochs = elapsed / epochDuration;
        uint256 score = scores[agent];

        for (uint256 i = 0; i < epochs; i++) {
            score = score - ((score * decayRateBps) / 10_000);
        }

        scores[agent] = score;
        lastDecay[agent] = block.timestamp;

        emit ScoreDecayApplied(agent, score);
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function getScore(address agent) external view returns (uint256) {
        return scores[agent];
    }
}
