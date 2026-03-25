"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ethers } from "ethers";

import { createMarket, fetchMarkets, placeBet } from "@/lib/api";

export interface Market {
  marketId: string;
  address: string;
  title: string;
  description?: string;
  yesOdds: number | null;
  noOdds: number | null;
  yesPool: number;
  noPool: number;
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

const BET_IFACE = new ethers.Interface(["function betYes()", "function betNo()"]);

export function useMarkets() {
  const queryClient = useQueryClient();
  const marketsQuery = useQuery({
    queryKey: ["markets"],
    queryFn: fetchMarkets,
  });

  const markets = marketsQuery.data ?? [];

  const createMarketMutation = useMutation({
    mutationFn: async (input: CreateMarketInput) => createMarket(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
  });

  const placeBetMutation = useMutation({
    mutationFn: async (input: PlaceBetInput) => {
      const market = markets.find((item) => item.marketId === input.marketId);
      if (!market?.address) {
        throw new Error("Market contract address unavailable");
      }
      if (!(window as Window & { ethereum?: unknown }).ethereum) {
        throw new Error("Wallet not detected");
      }

      const provider = new ethers.BrowserProvider(
        (window as Window & { ethereum?: unknown }).ethereum as any
      );
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

      return placeBet({
        marketId: input.marketId,
        side: input.side,
        amount: input.amount,
        txHash: tx.hash,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
  });

  const error =
    (createMarketMutation.error as Error | null) ??
    (placeBetMutation.error as Error | null) ??
    (marketsQuery.error as Error | null) ??
    null;

  return {
    markets,
    getMarketById: (marketId: string) => markets.find((market) => market.marketId === marketId),
    createMarket: createMarketMutation.mutateAsync,
    placeBet: placeBetMutation.mutateAsync,
    fetchNext: async () => undefined,
    hasMore: false,
    isLoading: marketsQuery.isLoading,
    isCreating: createMarketMutation.isPending,
    isBetting: placeBetMutation.isPending,
    error,
    refetch: marketsQuery.refetch,
  };
}
