import { ethers } from "hardhat";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name}_NOT_CONFIGURED`);
  }
  return value;
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying oracle contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const governanceRaw = requiredEnv("GOVERNANCE_ADDRESS");
  if (!ethers.utils.isAddress(governanceRaw)) {
    throw new Error("GOVERNANCE_ADDRESS_INVALID");
  }
  const governance = ethers.utils.getAddress(governanceRaw);

  const minOracleStake = ethers.utils.parseEther(
    process.env.MIN_ORACLE_STAKE_ETH?.trim() || "5"
  );
  const oracleWeightCapBps = Number(
    process.env.ORACLE_WEIGHT_CAP_BPS?.trim() || "2000"
  );
  const baseSlashBps = Number(process.env.BASE_SLASH_BPS?.trim() || "1000");
  if (
    !Number.isFinite(oracleWeightCapBps) ||
    oracleWeightCapBps < 0 ||
    oracleWeightCapBps > 10_000
  ) {
    throw new Error("ORACLE_WEIGHT_CAP_BPS_INVALID");
  }
  if (!Number.isFinite(baseSlashBps) || baseSlashBps < 0 || baseSlashBps > 10_000) {
    throw new Error("BASE_SLASH_BPS_INVALID");
  }

  const OracleRegistry = await ethers.getContractFactory("OracleRegistry");
  const oracleRegistry = await OracleRegistry.deploy(governance);
  await oracleRegistry.deployed();
  console.log("OracleRegistry deployed at:", oracleRegistry.address);

  const OracleStaking = await ethers.getContractFactory("OracleStaking");
  const oracleStaking = await OracleStaking.deploy(
    governance,
    oracleRegistry.address,
    minOracleStake
  );
  await oracleStaking.deployed();
  console.log("OracleStaking deployed at:", oracleStaking.address);

  const OracleConsensus = await ethers.getContractFactory("OracleConsensus");
  const oracleConsensus = await OracleConsensus.deploy(
    governance,
    oracleRegistry.address,
    oracleStaking.address,
    oracleWeightCapBps
  );
  await oracleConsensus.deployed();
  console.log("OracleConsensus deployed at:", oracleConsensus.address);

  const OracleSlashing = await ethers.getContractFactory("OracleSlashing");
  const oracleSlashing = await OracleSlashing.deploy(
    governance,
    oracleConsensus.address,
    oracleStaking.address,
    oracleRegistry.address,
    baseSlashBps
  );
  await oracleSlashing.deployed();
  console.log("OracleSlashing deployed at:", oracleSlashing.address);

  console.log("=======================================");
  console.log(" ORACLE DEPLOYMENT COMPLETE");
  console.log("=======================================");
  console.log("OracleRegistry :", oracleRegistry.address);
  console.log("OracleStaking  :", oracleStaking.address);
  console.log("OracleConsensus:", oracleConsensus.address);
  console.log("OracleSlashing :", oracleSlashing.address);
  console.log("Governance     :", governance);
  console.log("=======================================");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

