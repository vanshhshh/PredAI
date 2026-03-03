import { ethers } from "hardhat";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name}_NOT_CONFIGURED`);
  }
  return value;
}

function readIntEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
    throw new Error(`${name}_INVALID`);
  }
  return parsed;
}

function readEthEnv(name: string, fallback: string) {
  const raw = process.env[name]?.trim() || fallback;
  return ethers.utils.parseEther(raw);
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying core contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const governance = requiredEnv("GOVERNANCE_ADDRESS");
  const oracleConsensus = requiredEnv("ORACLE_CONSENSUS_ADDRESS");
  if (!ethers.utils.isAddress(governance)) {
    throw new Error("GOVERNANCE_ADDRESS_INVALID");
  }
  if (!ethers.utils.isAddress(oracleConsensus)) {
    throw new Error("ORACLE_CONSENSUS_ADDRESS_INVALID");
  }

  const MIN_MARKET_DURATION = readIntEnv("MIN_MARKET_DURATION_SECONDS", 60 * 60);
  const MAX_MARKET_DURATION = readIntEnv("MAX_MARKET_DURATION_SECONDS", 60 * 60 * 24 * 30);
  if (MAX_MARKET_DURATION <= MIN_MARKET_DURATION) {
    throw new Error("MAX_MARKET_DURATION_SECONDS_INVALID");
  }

  const MAX_MARKET_EXPOSURE = readEthEnv("MAX_MARKET_EXPOSURE_ETH", "1000000");
  const MARKET_CREATION_BOND = readEthEnv("MARKET_CREATION_BOND_ETH", "0.1");

  const governanceAddress = ethers.utils.getAddress(governance);
  const oracleConsensusAddress = ethers.utils.getAddress(oracleConsensus);

  const deployerNonce = await deployer.getTransactionCount();
  const predictedFactoryAddress = ethers.utils.getContractAddress({
    from: deployer.address,
    nonce: deployerNonce + 1,
  });

  const MarketRegistry = await ethers.getContractFactory("MarketRegistry");
  const marketRegistry = await MarketRegistry.deploy(
    governanceAddress,
    predictedFactoryAddress
  );
  await marketRegistry.deployed();
  console.log("MarketRegistry deployed at:", marketRegistry.address);

  const MarketFactory = await ethers.getContractFactory("MarketFactory");
  const marketFactory = await MarketFactory.deploy(
    governanceAddress,
    marketRegistry.address,
    MIN_MARKET_DURATION,
    MAX_MARKET_DURATION,
    MAX_MARKET_EXPOSURE,
    MARKET_CREATION_BOND
  );
  await marketFactory.deployed();
  console.log("MarketFactory deployed at:", marketFactory.address);

  const configuredFactory = await marketRegistry.marketFactory();
  if (configuredFactory.toLowerCase() !== marketFactory.address.toLowerCase()) {
    throw new Error("FACTORY_WIRING_MISMATCH");
  }

  const SettlementEngine = await ethers.getContractFactory("SettlementEngine");
  const settlementEngine = await SettlementEngine.deploy(
    governanceAddress,
    oracleConsensusAddress,
    marketRegistry.address
  );
  await settlementEngine.deployed();
  console.log("SettlementEngine deployed at:", settlementEngine.address);

  console.log("=======================================");
  console.log(" CORE DEPLOYMENT COMPLETE");
  console.log("=======================================");
  console.log("MarketRegistry  :", marketRegistry.address);
  console.log("MarketFactory   :", marketFactory.address);
  console.log("SettlementEngine:", settlementEngine.address);
  console.log("Governance      :", governanceAddress);
  console.log("OracleConsensus :", oracleConsensusAddress);
  console.log("=======================================");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

