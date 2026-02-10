// File: scripts/emergency_pause.ts

/**
 * PURPOSE
 * -------
 * Emergency circuit breaker for on-chain protocol components.
 *
 * This script:
 * - pauses critical smart contracts via governance / owner role
 * - is intended for SEV-1 incidents only
 * - leaves an on-chain audit trail
 *
 * SAFETY GUARANTEES
 * -----------------
 * - Explicit contract list (no wildcards)
 * - Explicit confirmation flag
 * - Readable logs
 *
 * USAGE
 * -----
 * CONFIRM=true RPC_URL=... PRIVATE_KEY=... npx ts-node scripts/emergency_pause.ts
 */

import { ethers } from "ethers";
import * as process from "process";

const RPC_URL = process.env.RPC_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const CONFIRM = process.env.CONFIRM === "true";

if (!RPC_URL || !PRIVATE_KEY) {
  throw new Error("RPC_URL and PRIVATE_KEY must be set");
}

if (!CONFIRM) {
  console.error(
    "❌ CONFIRM=true not set. Refusing to execute emergency pause."
  );
  process.exit(1);
}

// ------------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------------

const CONTRACTS_TO_PAUSE: Array<{
  name: string;
  address: string;
  abi: any[];
}> = [
  {
    name: "MarketFactory",
    address: process.env.MARKET_FACTORY_ADDRESS || "",
    abi: [
      "function pause() external",
      "function paused() view returns (bool)",
    ],
  },
  {
    name: "SettlementEngine",
    address: process.env.SETTLEMENT_ENGINE_ADDRESS || "",
    abi: [
      "function pause() external",
      "function paused() view returns (bool)",
    ],
  },
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("⚠️  EMERGENCY PAUSE INITIATED");
  console.log("Signer:", wallet.address);

  for (const c of CONTRACTS_TO_PAUSE) {
    if (!c.address) {
      console.warn(`Skipping ${c.name}: no address`);
      continue;
    }

    const contract = new ethers.Contract(
      c.address,
      c.abi,
      wallet
    );

    const alreadyPaused = await contract.paused();
    if (alreadyPaused) {
      console.log(`ℹ️  ${c.name} already paused`);
      continue;
    }

    console.log(`⏸️  Pausing ${c.name}...`);
    const tx = await contract.pause();
    await tx.wait();

    console.log(
      `✅ ${c.name} paused (tx: ${tx.hash})`
    );
  }

  console.log("🚨 Emergency pause complete.");
}

main().catch((err) => {
  console.error("Emergency pause failed:", err);
  process.exit(1);
});
