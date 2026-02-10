// File: contracts/deploy/deploy_core.ts
// PURPOSE:
// --------
// Canonical deployment script for CORE protocol contracts.
// This script:
// - deploys contracts in strict dependency order
// - wires addresses correctly
// - emits deployment metadata
// - is deterministic and reproducible
//
// DESIGN RULES (from docs):
// -------------------------
// - No hardcoded addresses
// - No private keys in code
// - Single responsibility per script
// - Idempotent-friendly (re-runnable with same config)
//
// Tooling: Hardhat + ethers v6

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying core contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    (await deployer.getBalance()).toString()
  );

  /*//////////////////////////////////////////////////////////////
                        CONFIGURATION
  //////////////////////////////////////////////////////////////*/

  const MIN_MARKET_DURATION = 60 * 60;
  const MAX_MARKET_DURATION = 60 * 60 * 24 * 30;
  const MAX_MARKET_EXPOSURE = ethers.utils.parseEther("1000000");
  const MARKET_CREATION_BOND = ethers.utils.parseEther("0.1");

  /*//////////////////////////////////////////////////////////////
                        GOVERNANCE
  //////////////////////////////////////////////////////////////*/

  const GOVERNANCE = deployer.address;

  /*//////////////////////////////////////////////////////////////
                        MARKET REGISTRY
  //////////////////////////////////////////////////////////////*/

  const MarketRegistry = await ethers.getContractFactory("MarketRegistry");
  const marketRegistry = await MarketRegistry.deploy(
    GOVERNANCE,
    ethers.constants.AddressZero
  );
  await marketRegistry.deployed();

  console.log("MarketRegistry deployed at:", marketRegistry.address);

  /*//////////////////////////////////////////////////////////////
                        MARKET FACTORY
  //////////////////////////////////////////////////////////////*/

  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy(
    GOVERNANCE,
    marketRegistry.address,
    MIN_MARKET_DURATION,
    MAX_MARKET_DURATION,
    MAX_MARKET_EXPOSURE,
    MARKET_CREATION_BOND
  );
  await marketFactory.deployed();

  console.log("MarketFactory deployed at:", marketFactory.address);

  const tx = await marketRegistry.updateFactory(marketFactory.address);
  await tx.wait();

  console.log("MarketRegistry factory updated");

  /*//////////////////////////////////////////////////////////////
                        SETTLEMENT ENGINE
  //////////////////////////////////////////////////////////////*/

  const SettlementEngine = await ethers.getContractFactory("SettlementEngine");
  const settlementEngine = await SettlementEngine.deploy(
    GOVERNANCE,
    ethers.constants.AddressZero,
    marketRegistry.address
  );
  await settlementEngine.deployed();

  console.log(
    "SettlementEngine deployed at:",
    settlementEngine.address
  );

  /*//////////////////////////////////////////////////////////////
                        SUMMARY
  //////////////////////////////////////////////////////////////*/

  console.log("=======================================");
  console.log(" CORE DEPLOYMENT COMPLETE");
  console.log("=======================================");
  console.log("MarketRegistry  :", marketRegistry.address);
  console.log("MarketFactory   :", marketFactory.address);
  console.log("SettlementEngine:", settlementEngine.address);
  console.log("Governance      :", GOVERNANCE);
  console.log("=======================================");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
