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

function readBigNumberEnv(name: string, fallback: string) {
  const raw = process.env[name]?.trim() || fallback;
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${name}_INVALID`);
  }
  return ethers.BigNumber.from(raw);
}

function requiredAddress(name: string): string {
  const value = requiredEnv(name);
  if (!ethers.utils.isAddress(value)) {
    throw new Error(`${name}_INVALID`);
  }
  return ethers.utils.getAddress(value);
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying core contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const governanceAddress = requiredAddress("GOVERNANCE_ADDRESS");
  const oracleConsensusAddress = requiredAddress("ORACLE_CONSENSUS_ADDRESS");
  const collateralTokenAddress = requiredAddress("COLLATERAL_TOKEN_ADDRESS");
  const feeTreasuryAddress = requiredAddress("FEE_TREASURY_ADDRESS");

  const MIN_MARKET_DURATION = readIntEnv("MIN_MARKET_DURATION_SECONDS", 60 * 60);
  const MAX_MARKET_DURATION = readIntEnv("MAX_MARKET_DURATION_SECONDS", 60 * 60 * 24 * 30);
  if (MAX_MARKET_DURATION <= MIN_MARKET_DURATION) {
    throw new Error("MAX_MARKET_DURATION_SECONDS_INVALID");
  }

  const MAX_MARKET_EXPOSURE = readBigNumberEnv("MAX_MARKET_EXPOSURE_UNITS", "1000000000000");
  const MARKET_CREATION_BOND = readBigNumberEnv("MARKET_CREATION_BOND_UNITS", "100000000");
  const PROTOCOL_FEE_BPS = readIntEnv("PROTOCOL_FEE_BPS", 50);
  const DISPUTE_WINDOW_SECONDS = readIntEnv("DISPUTE_WINDOW_SECONDS", 60 * 60);
  if (PROTOCOL_FEE_BPS > 1_000) {
    throw new Error("PROTOCOL_FEE_BPS_INVALID");
  }

  const deployerNonce = await deployer.getTransactionCount();
  const predictedFactoryAddress = ethers.utils.getContractAddress({
    from: deployer.address,
    nonce: deployerNonce + 1,
  });
  const predictedSettlementEngineAddress = ethers.utils.getContractAddress({
    from: deployer.address,
    nonce: deployerNonce + 2,
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
    MARKET_CREATION_BOND,
    predictedSettlementEngineAddress,
    collateralTokenAddress,
    feeTreasuryAddress,
    PROTOCOL_FEE_BPS,
    DISPUTE_WINDOW_SECONDS
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
  if (settlementEngine.address.toLowerCase() !== predictedSettlementEngineAddress.toLowerCase()) {
    throw new Error("SETTLEMENT_ENGINE_WIRING_MISMATCH");
  }

  console.log("=======================================");
  console.log(" CORE DEPLOYMENT COMPLETE");
  console.log("=======================================");
  console.log("MarketRegistry  :", marketRegistry.address);
  console.log("MarketFactory   :", marketFactory.address);
  console.log("SettlementEngine:", settlementEngine.address);
  console.log("CollateralToken :", collateralTokenAddress);
  console.log("FeeTreasury     :", feeTreasuryAddress);
  console.log("ProtocolFeeBps  :", PROTOCOL_FEE_BPS);
  console.log("DisputeWindow   :", DISPUTE_WINDOW_SECONDS);
  console.log("Governance      :", governanceAddress);
  console.log("OracleConsensus :", oracleConsensusAddress);
  console.log("=======================================");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
