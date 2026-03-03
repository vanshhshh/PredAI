"use client";

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";

/* ------------------------------------------------------------------ */
/* TYPES */
/* ------------------------------------------------------------------ */

export interface Market {
  marketId: string;
  address: string;
  title: string;
  description?: string;
  yesOdds: number | null;
  noOdds: number | null;
  liquidity: number;
  endTime: number;
  settled: boolean;
}

export interface CreateMarketInput {
  title: string;
  description?: string;
  endTime: number;
  maxExposure: number;
  metadata?: string;
}

export interface PlaceBetInput {
  marketId: string;
  side: "YES" | "NO";
  amount: number;
}

const BET_IFACE = new ethers.Interface([
  "function betYes()",
  "function betNo()",
]);

/* ------------------------------------------------------------------ */
/* HOOK */
/* ------------------------------------------------------------------ */

export function useMarkets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isBetting, setIsBetting] = useState<boolean>(false);

  const [error, setError] = useState<Error | null>(null);

  /* ------------------------------------------------------------------ */
  /* FETCH MARKETS (PAGINATED) */
  /* ------------------------------------------------------------------ */

  const fetchMarkets = useCallback(
    async (reset: boolean = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/markets?page=${reset ? 0 : page}`,
          { cache: "no-store" }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch markets");
        }

        const data = await res.json();

        const newMarkets: Market[] = data.markets ?? [];
        const more: boolean = data.hasMore ?? false;

        setMarkets((prev) =>
          reset ? newMarkets : [...prev, ...newMarkets]
        );
        setHasMore(more);

        if (!reset) {
          setPage((p) => p + 1);
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [page]
  );

  useEffect(() => {
    fetchMarkets(true);
  }, [fetchMarkets]);

  /* ------------------------------------------------------------------ */
  /* SINGLE MARKET ACCESS */
  /* ------------------------------------------------------------------ */

  const getMarketById = useCallback(
    (marketId: string): Market | undefined => {
      return markets.find((m) => m.marketId === marketId);
    },
    [markets]
  );

  /* ------------------------------------------------------------------ */
  /* CREATE MARKET */
  /* ------------------------------------------------------------------ */

  const createMarket = useCallback(
    async (input: CreateMarketInput) => {
      setIsCreating(true);
      setError(null);

      try {
        const res = await fetch("/api/markets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CREATE_MARKET",
            payload: input,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to create market");
        }

        await fetchMarkets(true);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [fetchMarkets]
  );

  /* ------------------------------------------------------------------ */
  /* PLACE BET */
  /* ------------------------------------------------------------------ */

  const placeBet = useCallback(
    async (input: PlaceBetInput) => {
      setIsBetting(true);
      setError(null);

      try {
        const market = markets.find((m) => m.marketId === input.marketId);
        if (!market?.address) {
          throw new Error("Market contract address unavailable");
        }
        if (!(window as any).ethereum) {
          throw new Error("Wallet not detected");
        }

        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const tx = await signer.sendTransaction({
          to: market.address,
          value: BigInt(Math.max(0, Math.floor(input.amount))),
          data:
            input.side === "YES"
              ? BET_IFACE.encodeFunctionData("betYes")
              : BET_IFACE.encodeFunctionData("betNo"),
        });
        await tx.wait();

        const res = await fetch("/api/markets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "PLACE_BET",
            payload: {
              ...input,
              txHash: tx.hash,
            },
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to place bet");
        }

        await fetchMarkets(true);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsBetting(false);
      }
    },
    [fetchMarkets, markets]
  );

  /* ------------------------------------------------------------------ */
  /* PAGINATION */
  /* ------------------------------------------------------------------ */

  const fetchNext = useCallback(() => {
    if (!hasMore || isLoading) return;
    fetchMarkets(false);
  }, [fetchMarkets, hasMore, isLoading]);

  /* ------------------------------------------------------------------ */
  /* PUBLIC API (STABLE CONTRACT) */
  /* ------------------------------------------------------------------ */

  return {
    markets,

    getMarketById,

    createMarket,
    placeBet,

    fetchNext,
    hasMore,

    isLoading,
    isCreating,
    isBetting,

    error,

    refetch: () => fetchMarkets(true),
  };
}
