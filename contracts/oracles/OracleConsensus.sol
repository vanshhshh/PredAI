// File: contracts/oracles/OracleConsensus.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    OracleConsensus.sol

    PURPOSE
    -------
    Deterministic on-chain consensus engine for oracle submissions.
    This contract:
    - accepts signed oracle outcomes
    - aggregates weighted votes
    - finalizes consensus per market
    - exposes a single, canonical outcome to SettlementEngine

    GUARANTEES (from docs)
    ---------------------
    - No discretionary resolution
    - Deterministic aggregation
    - Weight bounded by stake & governance caps
    - Event-sourced, replayable decisions

    TRUST MODEL
    -----------
    - Individual oracles may be wrong
    - Economic majority assumed honest
    - Governance is fallback only
*/

import {OracleRegistry} from "./OracleRegistry.sol";
import {OracleStaking} from "./OracleStaking.sol";

contract OracleConsensus {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyGovernance();
    error OracleNotActive();
    error AlreadySubmitted();
    error ConsensusClosed();
    error ConsensusNotFinalized();
    error InvalidMarket();
    error WeightCapExceeded();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event OracleSubmitted(
        address indexed oracle,
        address indexed market,
        bool outcome,
        uint256 weight
    );

    event ConsensusFinalized(
        address indexed market,
        bool outcome,
        uint256 totalYesWeight,
        uint256 totalNoWeight
    );

    event WeightCapUpdated(uint256 newCap);

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    address public governance;
    OracleRegistry public immutable oracleRegistry;
    OracleStaking public immutable oracleStaking;

    /// @notice Max weight an oracle can contribute (bps of total stake)
    uint256 public oracleWeightCapBps;

    struct MarketConsensus {
        bool finalized;
        bool outcome;
        uint256 yesWeight;
        uint256 noWeight;
        mapping(address => bool) submitted;
    }

    /// @notice market => consensus data
    mapping(address => MarketConsensus) private consensuses;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyGovernance() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    modifier onlyActiveOracle() {
        if (!oracleRegistry.isActiveOracle(msg.sender))
            revert OracleNotActive();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _governance,
        address _oracleRegistry,
        address _oracleStaking,
        uint256 _oracleWeightCapBps
    ) {
        require(_governance != address(0), "INVALID_GOVERNANCE");
        require(_oracleRegistry != address(0), "INVALID_REGISTRY");
        require(_oracleStaking != address(0), "INVALID_STAKING");

        governance = _governance;
        oracleRegistry = OracleRegistry(_oracleRegistry);
        oracleStaking = OracleStaking(_oracleStaking);
        oracleWeightCapBps = _oracleWeightCapBps;
    }

    /*//////////////////////////////////////////////////////////////
                        GOVERNANCE CONTROLS
    //////////////////////////////////////////////////////////////*/

    function updateWeightCap(uint256 newCapBps)
        external
        onlyGovernance
    {
        require(newCapBps <= 10_000, "INVALID_CAP");
        oracleWeightCapBps = newCapBps;
        emit WeightCapUpdated(newCapBps);
    }

    /*//////////////////////////////////////////////////////////////
                        SUBMISSION LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Submit oracle outcome for a market
     */
    function submitOutcome(address market, bool outcome)
        external
        onlyActiveOracle
    {
        MarketConsensus storage mc = consensuses[market];

        if (mc.finalized) revert ConsensusClosed();
        if (mc.submitted[msg.sender]) revert AlreadySubmitted();

        uint256 oracleStake = oracleStaking.getStake(msg.sender);
        uint256 totalStake = oracleStaking.totalStaked();

        uint256 maxWeight =
            (totalStake * oracleWeightCapBps) / 10_000;

        uint256 weight =
            oracleStake > maxWeight ? maxWeight : oracleStake;

        if (weight == 0) revert WeightCapExceeded();

        mc.submitted[msg.sender] = true;

        if (outcome) {
            mc.yesWeight += weight;
        } else {
            mc.noWeight += weight;
        }

        emit OracleSubmitted(msg.sender, market, outcome, weight);
    }

    /*//////////////////////////////////////////////////////////////
                        FINALIZATION LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Finalize consensus after submission window
     */
    function finalizeConsensus(address market)
        external
        onlyGovernance
    {
        MarketConsensus storage mc = consensuses[market];
        if (mc.finalized) revert ConsensusClosed();

        mc.finalized = true;
        mc.outcome = mc.yesWeight >= mc.noWeight;

        emit ConsensusFinalized(
            market,
            mc.outcome,
            mc.yesWeight,
            mc.noWeight
        );
    }

    /*//////////////////////////////////////////////////////////////
                        VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function isFinalized(address market) external view returns (bool) {
        return consensuses[market].finalized;
    }

    function getOutcome(address market)
        external
        view
        returns (bool outcome)
    {
        MarketConsensus storage mc = consensuses[market];
        if (!mc.finalized) revert ConsensusNotFinalized();
        return mc.outcome;
    }
}
