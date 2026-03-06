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

function parseChainIdNumber(): number {
  const raw = process.env.NEXT_PUBLIC_CHAIN_ID?.trim();
  const value = Number(raw);
  if (Number.isInteger(value) && value > 0) {
    return value;
  }
  return 80002;
}

const CHAIN_DEFAULT_ADDRESSES: Record<number, AddressConfig> = {
  80002: {
    agentRegistry: "0x588140A031aDA47e67BB54667d2caAF70Bc04b6C",
    agentStaking: "0x8E6db4E8FB0E940045261f65c52842dCF8aCE1e5",
    oracleRegistry: "0x553a86753c4064D94C8235c62C0860323e26848c",
    oracleStaking: "0x14ea6585d695568c6bBa26cE6515f8B9cD080317",
    oracleConsensus: "0x82FFe8DcfAA6411F90d18d5005bB4233c4A77750",
  },
};

const chainDefaults =
  CHAIN_DEFAULT_ADDRESSES[parseChainIdNumber()] ?? ({} as AddressConfig);

export const contractAddresses: AddressConfig = {
  agentRegistry: readEnvAddress(
    "NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS",
    "NEXT_PUBLIC_AGENT_REGISTRY"
  ) || chainDefaults.agentRegistry,
  agentStaking: readEnvAddress(
    "NEXT_PUBLIC_AGENT_STAKING_ADDRESS",
    "NEXT_PUBLIC_AGENT_STAKING"
  ) || chainDefaults.agentStaking,
  oracleRegistry: readEnvAddress(
    "NEXT_PUBLIC_ORACLE_REGISTRY_ADDRESS",
    "NEXT_PUBLIC_ORACLE_REGISTRY"
  ) || chainDefaults.oracleRegistry,
  oracleStaking: readEnvAddress(
    "NEXT_PUBLIC_ORACLE_STAKING_ADDRESS",
    "NEXT_PUBLIC_ORACLE_STAKING"
  ) || chainDefaults.oracleStaking,
  oracleConsensus: readEnvAddress(
    "NEXT_PUBLIC_ORACLE_CONSENSUS_ADDRESS",
    "NEXT_PUBLIC_ORACLE_CONSENSUS"
  ) || chainDefaults.oracleConsensus,
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
  if (id === 80002) {
    const rpcUrl =
      process.env.NEXT_PUBLIC_RPC_URL?.trim() || "https://rpc-amoy.polygon.technology";
    return {
      chainId: "0x13882",
      chainName: "Polygon Amoy",
      nativeCurrency: {
        name: "POL",
        symbol: "POL",
        decimals: 18,
      },
      rpcUrls: [rpcUrl],
      blockExplorerUrls: ["https://amoy.polygonscan.com"],
    };
  }
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
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return BigInt(value);
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
