"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { createWalletClient, custom, parseEther, type Address, type Chain, type Hex } from "viem";
import { polygon } from "viem/chains";

import { ArgumentStaker } from "../../../components/Social/ArgumentStaker";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { DEFAULT_CHAIN_ID } from "../../../lib/constants";
import { useSocialFeeds } from "../../../hooks/useSocialFeeds";
import { useWallet } from "../../../hooks/useWallet";

interface Argument {
  argumentId: string;
  text: string;
  confidence: number;
  totalStake: number;
  resolved: boolean;
}

type ToastState = {
  tone: "success" | "error";
  message: string;
};

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
};

const AGENT_REGISTRY_STAKE_ABI = [
  {
    type: "function",
    name: "stakeAndActivate",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
] as const;

const polygonAmoy: Chain = {
  id: 80002,
  name: "Polygon Amoy",
  network: "polygon-amoy",
  nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL?.trim() || "https://rpc-amoy.polygon.technology"] },
    public: { http: [process.env.NEXT_PUBLIC_RPC_URL?.trim() || "https://rpc-amoy.polygon.technology"] },
  },
  blockExplorers: {
    default: { name: "PolygonScan", url: "https://amoy.polygonscan.com" },
  },
  testnet: true,
};

export default function SocialArgumentsPage() {
  return (
    <ErrorBoundary>
      <ArgumentsContent />
    </ErrorBoundary>
  );
}

function ArgumentsContent() {
  const router = useRouter();
  const { isConnected, address } = useWallet();
  const { feeds, isLoading, error, stakeOnArgument, refetch } = useSocialFeeds();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [localStakeByArgument, setLocalStakeByArgument] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const argumentsFeed: Argument[] = useMemo(() => {
    return feeds
      .filter((feed) => typeof feed.signalScore === "number" && feed.signalScore > 0)
      .map((feed) => ({
        argumentId: feed.id,
        text: feed.content,
        confidence: feed.signalScore ?? 0,
        totalStake: localStakeByArgument[feed.id] ?? 0,
        resolved: false,
      }));
  }, [feeds, localStakeByArgument]);

  function readConfiguredChainId(): number {
    const raw = process.env.NEXT_PUBLIC_CHAIN_ID?.trim();
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_CHAIN_ID;
  }

  function readAgentRegistryAddress(): Address {
    const value =
      process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS?.trim() ||
      process.env.NEXT_PUBLIC_AGENT_REGISTRY?.trim() ||
      "";
    if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
      throw new Error("AgentRegistry address is not configured");
    }
    return value as Address;
  }

  async function ensureWalletChain(provider: Eip1193Provider, expectedChainId: number): Promise<void> {
    const expectedHex = `0x${expectedChainId.toString(16)}`;
    const currentHex = (await provider.request({ method: "eth_chainId" })) as string;
    if (currentHex?.toLowerCase() === expectedHex.toLowerCase()) {
      return;
    }

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: expectedHex }],
      });
    } catch (error) {
      const code = Number((error as { code?: unknown })?.code ?? 0);
      if (code !== 4902) {
        throw new Error(`Wrong network connected (expected chain ${expectedChainId})`);
      }

      if (expectedChainId === 80002) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x13882",
              chainName: "Polygon Amoy",
              nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
              rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL?.trim() || "https://rpc-amoy.polygon.technology"],
              blockExplorerUrls: ["https://amoy.polygonscan.com"],
            },
          ],
        });
      } else if (expectedChainId === 137) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x89",
              chainName: "Polygon",
              nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
              rpcUrls: ["https://polygon-rpc.com"],
              blockExplorerUrls: ["https://polygonscan.com"],
            },
          ],
        });
      } else {
        throw new Error(`Unsupported configured chain ${expectedChainId}`);
      }

      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: expectedHex }],
      });
    }
  }

  async function executeStakeTransaction(amount: number): Promise<{ txHash: Hex; account: Address }> {
    const ethereum = (window as Window & { ethereum?: Eip1193Provider }).ethereum;
    if (!ethereum) {
      throw new Error("Wallet provider not found");
    }

    const expectedChainId = readConfiguredChainId();
    await ensureWalletChain(ethereum, expectedChainId);

    const chain = expectedChainId === polygon.id ? polygon : polygonAmoy;
    const walletClient = createWalletClient({
      chain,
      transport: custom(ethereum),
    });
    const [account] = await walletClient.requestAddresses();
    if (!account) {
      throw new Error("Wallet account not available");
    }

    const txHash = await walletClient.writeContract({
      account,
      address: readAgentRegistryAddress(),
      abi: AGENT_REGISTRY_STAKE_ABI,
      functionName: "stakeAndActivate",
      value: parseEther(amount.toString()),
    });

    return { txHash, account };
  }

  if (isLoading) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Extracting reasoning signals..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-container py-14">
        <MessageCard title="Reasoning layer unavailable" message={error.message} tone="error" />
      </section>
    );
  }

  if (!argumentsFeed.length) {
    return (
      <section className="page-container py-14">
        <MessageCard
          title="No reasoning signals yet"
          message="AI and social streams have not produced stakeable arguments."
          tone="neutral"
        />
      </section>
    );
  }

  const averageConfidence =
    argumentsFeed.reduce((sum, item) => sum + item.confidence, 0) / argumentsFeed.length;

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Argument Markets</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Stake on Reasoning</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Evaluate machine and social reasoning signals, then allocate stake to
          arguments you believe will hold.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Active Arguments" value={argumentsFeed.length.toString()} />
        <StatCard label="Avg Confidence" value={averageConfidence.toFixed(2)} />
        <StatCard label="Wallet Connected" value={isConnected ? "Yes" : "No"} />
      </section>

      <section className="ui-card p-5">
        <ArgumentStaker
          items={argumentsFeed}
          isConnected={isConnected}
          onRequestConnect={() => {
            router.push("/sign-in");
          }}
          onStake={async ({ argumentId, amount }) => {
            if (!isConnected) {
              router.push("/sign-in");
              return;
            }
            if (!address) {
              throw new Error("Connect wallet to continue");
            }

            try {
              const { txHash } = await executeStakeTransaction(amount);
              await stakeOnArgument(argumentId, amount, address, txHash);
              setLocalStakeByArgument((previous) => ({
                ...previous,
                [argumentId]: (previous[argumentId] ?? 0) + amount,
              }));
              setToast({ tone: "success", message: "Staked successfully!" });
              await refetch();
            } catch (stakeError) {
              const message =
                stakeError instanceof Error ? stakeError.message : "Stake failed";
              setToast({ tone: "error", message });
              throw stakeError;
            }
          }}
        />
      </section>

      {toast && (
        <div
          className={`fixed right-4 top-4 z-[100] rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.tone === "success"
              ? "border-emerald-300/45 bg-emerald-500/20 text-emerald-100"
              : "border-rose-300/45 bg-rose-500/20 text-rose-100"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="ui-stat">
      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
    </article>
  );
}

function MessageCard({
  title,
  message,
  tone,
}: {
  title: string;
  message: string;
  tone: "neutral" | "error";
}) {
  return (
    <article className="ui-card max-w-2xl p-6">
      <h2
        className={`text-lg font-semibold ${
          tone === "error" ? "text-rose-200" : "text-slate-100"
        }`}
      >
        {title}
      </h2>
      <p className={`mt-2 text-sm ${tone === "error" ? "text-rose-100" : "text-slate-300"}`}>
        {message}
      </p>
    </article>
  );
}
