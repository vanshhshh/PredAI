// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Core
import "../core/MarketFactory.sol";
import "../core/MarketRegistry.sol";
import "../core/PredictionMarket.sol";
import "../core/SettlementEngine.sol";

// Agents
import "../agents/AgentNFT.sol";
import "../agents/AgentRegistry.sol";
import "../agents/AgentScoring.sol";
import "../agents/AgentStaking.sol";

// Oracles
import "../oracles/OracleConsensus.sol";
import "../oracles/OracleRegistry.sol";
import "../oracles/OracleSlashing.sol";
import "../oracles/OracleStaking.sol";

// Governance
import "../governance/DAO.sol";
import "../governance/ParameterController.sol";
import "../governance/Timelock.sol";

// RWA
import "../rwa/CrossChainAdapter.sol";
import "../rwa/OutcomeWrapper.sol";
import "../rwa/RWAToken.sol";

// Yield
import "../yield/CapitalRouter.sol";
import "../yield/RiskAllocator.sol";
import "../yield/YieldVault.sol";

