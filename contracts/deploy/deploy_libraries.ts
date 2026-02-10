// contracts/deploy/deploy_libraries.ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying libraries with:", deployer.address);

  const deployed: Record<string, string> = {};

  // Example: only deploy if library exists
  const libraries = [
    "FixedPointMath",
    "MarketMath",
  ];

  for (const lib of libraries) {
    try {
      const Lib = await ethers.getContractFactory(lib);
      const instance = await Lib.deploy();
      await instance.deployed();
      deployed[lib] = instance.address;
      console.log(`${lib} deployed at:`, instance.address);
    } catch {
      console.log(`${lib} not deployable or not found — skipping`);
    }
  }

  console.log("LIBRARY DEPLOYMENT COMPLETE");
  console.log(deployed);
}

main().catch(console.error);
