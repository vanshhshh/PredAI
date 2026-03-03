"use client";

import { ethers } from "ethers";

type ContractTxInput = {
  address: string;
  abi: string[];
  functionName: string;
  args?: readonly unknown[];
  valueWei?: bigint;
  label: string;
};

type AddressConfig = {
  agentRegistry: string;
  agentStaking: string;
  oracleRegistry: string;
  oracleStaking: string;
  oracleConsensus: string;
};

function readEnvAddress(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

export const contractAddresses: AddressConfig = {
  agentRegistry: readEnvAddress(
    "NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS",
    "NEXT_PUBLIC_AGENT_REGISTRY"
  ),
  agentStaking: readEnvAddress(
    "NEXT_PUBLIC_AGENT_STAKING_ADDRESS",
    "NEXT_PUBLIC_AGENT_STAKING"
  ),
  oracleRegistry: readEnvAddress(
    "NEXT_PUBLIC_ORACLE_REGISTRY_ADDRESS",
    "NEXT_PUBLIC_ORACLE_REGISTRY"
  ),
  oracleStaking: readEnvAddress(
    "NEXT_PUBLIC_ORACLE_STAKING_ADDRESS",
    "NEXT_PUBLIC_ORACLE_STAKING"
  ),
  oracleConsensus: readEnvAddress(
    "NEXT_PUBLIC_ORACLE_CONSENSUS_ADDRESS",
    "NEXT_PUBLIC_ORACLE_CONSENSUS"
  ),
};

function parseExpectedChainId(): bigint | null {
  const raw = process.env.NEXT_PUBLIC_CHAIN_ID?.trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return BigInt(value);
}

function normalizeAddress(label: string, value: string): string {
  if (!value) {
    throw new Error(`${label} address is not configured`);
  }
  if (!ethers.isAddress(value)) {
    throw new Error(`${label} address is invalid`);
  }
  return ethers.getAddress(value);
}

export function toWeiAmount(amount: number): bigint {
  const normalized = Math.floor(Number(amount));
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new Error("Amount must be a positive integer");
  }
  return BigInt(normalized);
}

export async function sendContractTx(input: ContractTxInput): Promise<string> {
  const ethereum = (window as { ethereum?: ethers.Eip1193Provider }).ethereum;
  if (!ethereum) {
    throw new Error("Wallet not detected");
  }

  const provider = new ethers.BrowserProvider(ethereum);
  const expectedChainId = parseExpectedChainId();
  if (expectedChainId !== null) {
    const network = await provider.getNetwork();
    if (network.chainId !== expectedChainId) {
      throw new Error(
        `Wrong network connected (expected chain ${expectedChainId.toString()})`
      );
    }
  }

  const signer = await provider.getSigner();
  const iface = new ethers.Interface(input.abi);
  const to = normalizeAddress(input.label, input.address);
  const data = iface.encodeFunctionData(input.functionName, input.args ?? []);

  const tx = await signer.sendTransaction({
    to,
    data,
    value: input.valueWei ?? 0n,
  });
  await tx.wait();
  return tx.hash;
}
