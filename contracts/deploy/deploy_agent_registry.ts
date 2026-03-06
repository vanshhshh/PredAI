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

  console.log("Deploying AgentRegistry with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const governanceRaw = requiredEnv("GOVERNANCE_ADDRESS");
  if (!ethers.utils.isAddress(governanceRaw)) {
    throw new Error("GOVERNANCE_ADDRESS_INVALID");
  }
  const governance = ethers.utils.getAddress(governanceRaw);

  const minAgentStake = ethers.utils.parseEther(
    process.env.MIN_AGENT_STAKE_ETH?.trim() || "1"
  );

  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(governance, minAgentStake);
  await agentRegistry.deployed();

  console.log("=======================================");
  console.log(" AGENT REGISTRY DEPLOYED");
  console.log("=======================================");
  console.log("AgentRegistry :", agentRegistry.address);
  console.log("Governance    :", governance);
  console.log("=======================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

