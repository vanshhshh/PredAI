// File: contracts/core/SettlementEngine.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    SettlementEngine.sol

    PURPOSE
    -------
    Canonical settlement coordinator that bridges:
    - decentralized oracle consensus
    - final market settlement execution

    This contract:
    - does NOT decide outcomes
    - does NOT perform off-chain computation
    - ONLY enforces finality after oracle consensus

    GUARANTEES (from docs)
    ---------------------
    - Deterministic execution
    - Governance-bounded authority
    - Event-sourced settlements
    - No custody of funds
    - No discretionary override except via governance

    TRUST MODEL
    -----------
    - Oracle network is economically trusted
    - Governance is slow, bounded, and auditable
*/

import {MarketRegistry} from "./MarketRegistry.sol";
import {PredictionMarket} from "./PredictionMarket.sol";

contract SettlementEngine {
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/

    error OnlyOracleConsensus();
    error OnlyGovernance();
    error InvalidMarket();
    error MarketAlreadySettled();
    error OracleOutcomeMissing();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event MarketSettlementExecuted(
        address indexed market,
        bool outcome
    );

    event OracleConsensusSet(address indexed oracleConsensus);

    /*//////////////////////////////////////////////////////////////
                              STORAGE
    //////////////////////////////////////////////////////////////*/

    /// @notice Governance authority (DAO / Timelock)
    address public governance;

    /// @notice Authorized oracle consensus contract
    address public oracleConsensus;

    /// @notice Market registry
    MarketRegistry public immutable marketRegistry;

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier onlyOracleConsensus() {
        if (msg.sender != oracleConsensus) revert OnlyOracleConsensus();
        _;
    }

    modifier onlyGovernance() {
        if (msg.sender != governance) revert OnlyGovernance();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _governance,
        address _oracleConsensus,
        address _marketRegistry
    ) {
        require(_governance != address(0), "INVALID_GOVERNANCE");
        require(
    _oracleConsensus != address(0) || block.chainid == 80002,
    "INVALID_ORACLE"
);
        require(_marketRegistry != address(0), "INVALID_REGISTRY");

        governance = _governance;
        oracleConsensus = _oracleConsensus;
        marketRegistry = MarketRegistry(_marketRegistry);
    }

    /*//////////////////////////////////////////////////////////////
                        GOVERNANCE CONTROLS
    //////////////////////////////////////////////////////////////*/

    function updateOracleConsensus(address newOracleConsensus)
        external
        onlyGovernance
    {
        require(newOracleConsensus != address(0), "INVALID_ORACLE");
        oracleConsensus = newOracleConsensus;
        emit OracleConsensusSet(newOracleConsensus);
    }

    /*//////////////////////////////////////////////////////////////
                        SETTLEMENT EXECUTION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Execute settlement after oracle consensus
     * @dev Callable only by authorized oracle consensus contract
     */
    function settleMarket(
        address market,
        bool outcome
    ) external onlyOracleConsensus {
        if (!marketRegistry.isValidMarket(market)) revert InvalidMarket();

        PredictionMarket pm = PredictionMarket(market);

        if (pm.settled()) revert MarketAlreadySettled();

        // Execute settlement
        pm.settle(outcome);

        emit MarketSettlementExecuted(market, outcome);
    }

    /*//////////////////////////////////////////////////////////////
                        GOVERNANCE OVERRIDE (RARE)
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Governance-triggered settlement override
     * @dev Only for catastrophic oracle failure
     */
    function governanceSettleMarket(
        address market,
        bool outcome
    ) external onlyGovernance {
        if (!marketRegistry.isValidMarket(market)) revert InvalidMarket();

        PredictionMarket pm = PredictionMarket(market);

        if (pm.settled()) revert MarketAlreadySettled();

        pm.settle(outcome);

        emit MarketSettlementExecuted(market, outcome);
    }
}

