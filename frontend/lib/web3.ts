// File: frontend/lib/web3.ts

/**
 * PURPOSE
 * -------
 * Web3 initialization & helpers.
 *
 * This module:
 * - abstracts EVM provider access
 * - standardizes chain / network checks
 * - provides safe helpers for downstream usage
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No UI logic
 * - No wallet state here
 * - Minimal surface area
 * - EVM-first, chain-agnostic structure
 */

"use client";

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer?: string;
}

export const CHAINS: Record<number, ChainConfig> = {
  80002: {
    chainId: 80002,
    name: "Polygon Amoy",
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://rpc-amoy.polygon.technology",
    blockExplorer: "https://amoy.polygonscan.com",
  },
  8453: {
    chainId: 8453,
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
  },
  137: {
    chainId: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    blockExplorer: "https://polygonscan.com",
  },
};

export function getEthereumProvider(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum ?? null;
}

export async function getCurrentChainId(): Promise<
  number | null
> {
  const provider = getEthereumProvider();
  if (!provider) return null;

  try {
    const hexChainId = await provider.request({
      method: "eth_chainId",
    });
    return parseInt(hexChainId, 16);
  } catch {
    return null;
  }
}

export async function switchChain(
  chainId: number
): Promise<boolean> {
  const provider = getEthereumProvider();
  if (!provider) return false;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [
        {
          chainId: "0x" + chainId.toString(16),
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

export function isSupportedChain(
  chainId: number | null
): boolean {
  if (!chainId) return false;
  return Boolean(CHAINS[chainId]);
}
