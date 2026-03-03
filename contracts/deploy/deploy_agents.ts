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

  console.log("Deploying agent contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const governanceRaw = requiredEnv("GOVERNANCE_ADDRESS");
  if (!ethers.utils.isAddress(governanceRaw)) {
    throw new Error("GOVERNANCE_ADDRESS_INVALID");
  }
  const governance = ethers.utils.getAddress(governanceRaw);

  const minAgentStake = ethers.utils.parseEther(
    process.env.MIN_AGENT_STAKE_ETH?.trim() || "1"
  );
  const scoreDecayBps = Number(process.env.SCORE_DECAY_BPS?.trim() || "500");
  const scoreEpochSeconds = Number(
    process.env.SCORE_EPOCH_SECONDS?.trim() || `${60 * 60 * 24}`
  );
  if (!Number.isFinite(scoreDecayBps) || scoreDecayBps < 0) {
    throw new Error("SCORE_DECAY_BPS_INVALID");
  }
  if (!Number.isFinite(scoreEpochSeconds) || scoreEpochSeconds <= 0) {
    throw new Error("SCORE_EPOCH_SECONDS_INVALID");
  }

  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(governance, minAgentStake);
  await agentRegistry.deployed();
  console.log("AgentRegistry deployed at:", agentRegistry.address);

  const AgentStaking = await ethers.getContractFactory("AgentStaking");
  const agentStaking = await AgentStaking.deploy(governance, agentRegistry.address);
  await agentStaking.deployed();
  console.log("AgentStaking deployed at:", agentStaking.address);

  const AgentScoring = await ethers.getContractFactory("AgentScoring");
  const agentScoring = await AgentScoring.deploy(
    governance,
    agentRegistry.address,
    scoreDecayBps,
    scoreEpochSeconds
  );
  await agentScoring.deployed();
  console.log("AgentScoring deployed at:", agentScoring.address);

  const AgentNFT = await ethers.getContractFactory("AgentNFT");
  const agentNFT = await AgentNFT.deploy(governance, agentRegistry.address);
  await agentNFT.deployed();
  console.log("AgentNFT deployed at:", agentNFT.address);

  console.log("=======================================");
  console.log(" AGENT DEPLOYMENT COMPLETE");
  console.log("=======================================");
  console.log("AgentRegistry :", agentRegistry.address);
  console.log("AgentStaking  :", agentStaking.address);
  console.log("AgentScoring  :", agentScoring.address);
  console.log("AgentNFT      :", agentNFT.address);
  console.log("Governance    :", governance);
  console.log("=======================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

