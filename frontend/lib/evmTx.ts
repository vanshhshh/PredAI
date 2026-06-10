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
  marketFactory: string;
  collateralToken: string;
  governanceDao: string;
  agentRegistry: string;
  agentStaking: string;
  oracleRegistry: string;
  oracleStaking: string;
  oracleConsensus: string;
};

const publicEnv = {
  NEXT_PUBLIC_MARKET_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_MARKET_FACTORY_ADDRESS,
  NEXT_PUBLIC_MARKET_FACTORY: process.env.NEXT_PUBLIC_MARKET_FACTORY,
  NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS,
  NEXT_PUBLIC_COLLATERAL_TOKEN: process.env.NEXT_PUBLIC_COLLATERAL_TOKEN,
  NEXT_PUBLIC_GOVERNANCE_DAO_ADDRESS: process.env.NEXT_PUBLIC_GOVERNANCE_DAO_ADDRESS,
  NEXT_PUBLIC_DAO_ADDRESS: process.env.NEXT_PUBLIC_DAO_ADDRESS,
  NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS,
  NEXT_PUBLIC_AGENT_REGISTRY: process.env.NEXT_PUBLIC_AGENT_REGISTRY,
  NEXT_PUBLIC_AGENT_STAKING_ADDRESS: process.env.NEXT_PUBLIC_AGENT_STAKING_ADDRESS,
  NEXT_PUBLIC_AGENT_STAKING: process.env.NEXT_PUBLIC_AGENT_STAKING,
  NEXT_PUBLIC_ORACLE_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_ORACLE_REGISTRY_ADDRESS,
  NEXT_PUBLIC_ORACLE_REGISTRY: process.env.NEXT_PUBLIC_ORACLE_REGISTRY,
  NEXT_PUBLIC_ORACLE_STAKING_ADDRESS: process.env.NEXT_PUBLIC_ORACLE_STAKING_ADDRESS,
  NEXT_PUBLIC_ORACLE_STAKING: process.env.NEXT_PUBLIC_ORACLE_STAKING,
  NEXT_PUBLIC_ORACLE_CONSENSUS_ADDRESS: process.env.NEXT_PUBLIC_ORACLE_CONSENSUS_ADDRESS,
  NEXT_PUBLIC_ORACLE_CONSENSUS: process.env.NEXT_PUBLIC_ORACLE_CONSENSUS,
} as const;

type PublicEnvKey = keyof typeof publicEnv;

function readEnvAddress(...keys: PublicEnvKey[]): string {
  for (const key of keys) {
    const value = publicEnv[key]?.trim();
    if (value) return value;
  }
  return "";
}

export const contractAddresses: AddressConfig = {
  marketFactory: readEnvAddress(
    "NEXT_PUBLIC_MARKET_FACTORY_ADDRESS",
    "NEXT_PUBLIC_MARKET_FACTORY"
  ),
  collateralToken: readEnvAddress(
    "NEXT_PUBLIC_COLLATERAL_TOKEN_ADDRESS",
    "NEXT_PUBLIC_COLLATERAL_TOKEN"
  ),
  governanceDao: readEnvAddress(
    "NEXT_PUBLIC_GOVERNANCE_DAO_ADDRESS",
    "NEXT_PUBLIC_DAO_ADDRESS"
  ),
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

type AddEthereumChainParam = {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
};

function chainParamsFor(chainId: bigint): AddEthereumChainParam | null {
  const id = Number(chainId);
  if (id === 137) {
    return {
      chainId: "0x89",
      chainName: "Polygon",
      nativeCurrency: {
        name: "POL",
        symbol: "POL",
        decimals: 18,
      },
      rpcUrls: ["https://polygon-rpc.com"],
      blockExplorerUrls: ["https://polygonscan.com"],
    };
  }
  return null;
}

function parseExpectedChainId(): bigint | null {
  const raw = process.env.NEXT_PUBLIC_CHAIN_ID?.trim();
  if (!raw) return 137n;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return BigInt(value);
}

function collateralDecimals(): number {
  const raw = process.env.NEXT_PUBLIC_COLLATERAL_DECIMALS?.trim() || "6";
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 36) {
    throw new Error("Collateral decimals are invalid");
  }
  return value;
}

export function collateralSymbol(): string {
  return process.env.NEXT_PUBLIC_COLLATERAL_SYMBOL?.trim() || "USDC";
}

export function marketCreationBondUnits(): bigint {
  const raw = process.env.NEXT_PUBLIC_MARKET_CREATION_BOND_UNITS?.trim() || "0";
  if (!/^\d+$/.test(raw)) {
    throw new Error("Market creation bond is invalid");
  }
  return BigInt(raw);
}

export function toCollateralUnits(amount: number | string): bigint {
  const raw =
    typeof amount === "number" ? amount.toString() : String(amount ?? "").trim();
  if (!raw) {
    throw new Error("Amount is required");
  }

  let parsed: bigint;
  try {
    parsed = ethers.parseUnits(raw, collateralDecimals());
  } catch {
    throw new Error(`Amount must be a valid ${collateralSymbol()} value`);
  }

  if (parsed <= 0n) {
    throw new Error("Amount must be greater than zero");
  }

  return parsed;
}

export function fromCollateralUnits(amount: number | string | bigint): number {
  try {
    const value = typeof amount === "bigint" ? amount : BigInt(String(amount ?? "0"));
    const formatted = ethers.formatUnits(value, collateralDecimals());
    const parsed = Number(formatted);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

async function readWalletChainId(
  ethereum: ethers.Eip1193Provider
): Promise<bigint> {
  const chainIdHex = (await ethereum.request({
    method: "eth_chainId",
  })) as string;
  return BigInt(chainIdHex);
}

async function ensureExpectedChain(
  ethereum: ethers.Eip1193Provider,
  expectedChainId: bigint
): Promise<void> {
  const currentChainId = await readWalletChainId(ethereum);
  if (currentChainId === expectedChainId) {
    return;
  }

  const chainHex = `0x${expectedChainId.toString(16)}`;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainHex }],
    });
  } catch (switchErr) {
    const code = Number((switchErr as { code?: unknown })?.code ?? 0);
    if (code === 4902) {
      const params = chainParamsFor(expectedChainId);
      if (!params) {
        throw new Error(
          `Unsupported configured chain ${expectedChainId.toString()} in wallet`
        );
      }
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [params],
      });
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainHex }],
      });
    } else {
      throw new Error(
        `Please switch wallet to chain ${expectedChainId.toString()} and retry`
      );
    }
  }

  const updatedChainId = await readWalletChainId(ethereum);
  if (updatedChainId !== expectedChainId) {
    throw new Error(
      `Wrong network connected (expected chain ${expectedChainId.toString()})`
    );
  }
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

export function toWeiAmount(amount: number | string): bigint {
  const raw =
    typeof amount === "number" ? amount.toString() : String(amount ?? "").trim();
  if (!raw) {
    throw new Error("Amount is required");
  }

  let parsed: bigint;
  try {
    parsed = ethers.parseEther(raw);
  } catch {
    throw new Error("Amount must be a valid decimal value");
  }

  if (parsed <= 0n) {
    throw new Error("Amount must be greater than zero");
  }

  return parsed;
}

export async function sendContractTx(input: ContractTxInput): Promise<string> {
  const ethereum = (window as { ethereum?: ethers.Eip1193Provider }).ethereum;
  if (!ethereum) {
    throw new Error("Wallet not detected");
  }

  const expectedChainId = parseExpectedChainId();
  if (expectedChainId !== null) {
    await ensureExpectedChain(ethereum, expectedChainId);
  }

  // Create provider after any potential chain switch to avoid stale-network race.
  const provider = new ethers.BrowserProvider(ethereum);
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
