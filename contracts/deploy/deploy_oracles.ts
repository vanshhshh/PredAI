// File: contracts/deploy/deploy_oracles.ts
// PURPOSE:
// --------
// Canonical deployment script for ORACLE-related protocol contracts.
// This script deploys and wires:
// - OracleRegistry
// - OracleStaking
// - OracleConsensus
// - OracleSlashing
//
// DESIGN RULES (from docs):
// -------------------------
// - Governance must be Timelock in production
// - Oracle weight caps & slashing params explicitly configured
// - No hidden wiring or implicit trust
// - Deterministic, auditable deployment
//
// Tooling: Hardhat + ethers v6

import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying oracle contracts with account:", deployer.address);
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

  const MIN_ORACLE_STAKE = ethers.utils.parseEther("5");
  const ORACLE_WEIGHT_CAP_BPS = 2000;
  const BASE_SLASH_BPS = 1000;

  /*//////////////////////////////////////////////////////////////
                        ORACLE REGISTRY
  //////////////////////////////////////////////////////////////*/

  const OracleRegistry = await ethers.getContractFactory("OracleRegistry");
  const oracleRegistry = await OracleRegistry.deploy(GOVERNANCE);
  await oracleRegistry.deployed();

  console.log("OracleRegistry deployed at:", oracleRegistry.address);

  /*//////////////////////////////////////////////////////////////
                        ORACLE STAKING
  //////////////////////////////////////////////////////////////*/

  const OracleStaking = await ethers.getContractFactory("OracleStaking");
  const oracleStaking = await OracleStaking.deploy(
    GOVERNANCE,
    oracleRegistry.address,
    MIN_ORACLE_STAKE
  );
  await oracleStaking.deployed();

  console.log("OracleStaking deployed at:", oracleStaking.address);

  /*//////////////////////////////////////////////////////////////
                        ORACLE CONSENSUS
  //////////////////////////////////////////////////////////////*/

  const OracleConsensus = await ethers.getContractFactory("OracleConsensus");
  const oracleConsensus = await OracleConsensus.deploy(
    GOVERNANCE,
    oracleRegistry.address,
    oracleStaking.address,
    ORACLE_WEIGHT_CAP_BPS
  );
  await oracleConsensus.deployed();

  console.log(
    "OracleConsensus deployed at:",
    oracleConsensus.address
  );

  /*//////////////////////////////////////////////////////////////
                        ORACLE SLASHING
  //////////////////////////////////////////////////////////////*/

  const OracleSlashing = await ethers.getContractFactory("OracleSlashing");
  const oracleSlashing = await OracleSlashing.deploy(
    GOVERNANCE,
    oracleConsensus.address,
    oracleStaking.address,
    oracleRegistry.address,
    BASE_SLASH_BPS
  );
  await oracleSlashing.deployed();

  console.log(
    "OracleSlashing deployed at:",
    oracleSlashing.address
  );

  /*//////////////////////////////////////////////////////////////
                        SUMMARY
  //////////////////////////////////////////////////////////////*/

  console.log("=======================================");
  console.log(" ORACLE DEPLOYMENT COMPLETE");
  console.log("=======================================");
  console.log("OracleRegistry :", oracleRegistry.address);
  console.log("OracleStaking  :", oracleStaking.address);
  console.log("OracleConsensus:", oracleConsensus.address);
  console.log("OracleSlashing :", oracleSlashing.address);
  console.log("Governance     :", GOVERNANCE);
  console.log("=======================================");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
