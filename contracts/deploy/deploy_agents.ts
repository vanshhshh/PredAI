// File: contracts/deploy/deploy_agents.ts
// PURPOSE:
// --------
// Canonical deployment script for AGENT-related protocol contracts.
// This script deploys and wires:
// - AgentRegistry
// - AgentStaking
// - AgentScoring
// - AgentNFT
//
// DESIGN RULES (from docs):
// -------------------------
// - Governance address must be Timelock in production
// - No business logic in deploy scripts
// - Explicit wiring, no hidden dependencies
// - Deterministic, auditable output
//
// Tooling: Hardhat + ethers v6

// File: contracts/deploy/deploy_agents.ts
// Tooling: Hardhat + ethers v5 (CORRECT)

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying agent contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    (await deployer.getBalance()).toString()
  );

  /*//////////////////////////////////////////////////////////////
                        GOVERNANCE
  //////////////////////////////////////////////////////////////*/

  const GOVERNANCE = deployer.address;

  /*//////////////////////////////////////////////////////////////
                        CONFIGURATION
  //////////////////////////////////////////////////////////////*/

  const MIN_AGENT_STAKE = ethers.utils.parseEther("1"); // ✅ v5
  const SCORE_DECAY_BPS = 500;
  const SCORE_EPOCH_SECONDS = 60 * 60 * 24;

  /*//////////////////////////////////////////////////////////////
                        AGENT REGISTRY
  //////////////////////////////////////////////////////////////*/

  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(
    GOVERNANCE,
    MIN_AGENT_STAKE
  );
  await agentRegistry.deployed(); // ✅ v5

  console.log("AgentRegistry deployed at:", agentRegistry.address);

  /*//////////////////////////////////////////////////////////////
                        AGENT STAKING
  //////////////////////////////////////////////////////////////*/

  const AgentStaking = await ethers.getContractFactory("AgentStaking");
  const agentStaking = await AgentStaking.deploy(
    GOVERNANCE,
    agentRegistry.address
  );
  await agentStaking.deployed();

  console.log("AgentStaking deployed at:", agentStaking.address);

  /*//////////////////////////////////////////////////////////////
                        AGENT SCORING
  //////////////////////////////////////////////////////////////*/

  const AgentScoring = await ethers.getContractFactory("AgentScoring");
  const agentScoring = await AgentScoring.deploy(
    GOVERNANCE,
    agentRegistry.address,
    SCORE_DECAY_BPS,
    SCORE_EPOCH_SECONDS
  );
  await agentScoring.deployed();

  console.log("AgentScoring deployed at:", agentScoring.address);

  /*//////////////////////////////////////////////////////////////
                        AGENT NFT
  //////////////////////////////////////////////////////////////*/

  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const agentNFT = await AgentNFT.deploy(
    GOVERNANCE,
    agentRegistry.address
  );
  await agentNFT.deployed();

  console.log("AgentNFT deployed at:", agentNFT.address);

  /*//////////////////////////////////////////////////////////////
                        SUMMARY
  //////////////////////////////////////////////////////////////*/

  console.log("=======================================");
  console.log(" AGENT DEPLOYMENT COMPLETE");
  console.log("=======================================");
  console.log("AgentRegistry :", agentRegistry.address);
  console.log("AgentStaking  :", agentStaking.address);
  console.log("AgentScoring  :", agentScoring.address);
  console.log("AgentNFT      :", agentNFT.address);
  console.log("Governance    :", GOVERNANCE);
  console.log("=======================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
