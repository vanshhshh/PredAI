"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createMarket, fetchMarkets, placeBet } from "@/lib/api";
import { contractAddresses, sendContractTx, toCollateralUnits } from "@/lib/evmTx";
import { useMarketStream } from "./useMarketStream";

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

export function useMarkets() {
  const queryClient = useQueryClient();
  useMarketStream();
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

      const amountUnits = toCollateralUnits(input.amount);

      await sendContractTx({
        address: contractAddresses.collateralToken,
        abi: ["function approve(address spender,uint256 amount) returns (bool)"],
        functionName: "approve",
        args: [market.address, amountUnits],
        label: "CollateralToken",
      });

      const txHash = await sendContractTx({
        address: market.address,
        abi: [
          "function betYes(uint256 amount)",
          "function betNo(uint256 amount)",
        ],
        functionName: input.side === "YES" ? "betYes" : "betNo",
        args: [amountUnits],
        label: "PredictionMarket",
      });

      return placeBet({
        marketId: input.marketId,
        side: input.side,
        amount: amountUnits.toString(),
        txHash,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (marketId: string) => {
      const market = markets.find((item) => item.marketId === marketId);
      if (!market?.address) {
        throw new Error("Market contract address unavailable");
      }
      return sendContractTx({
        address: market.address,
        abi: ["function claim()"],
        functionName: "claim",
        label: "PredictionMarket",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
  });

  const error =
    (createMarketMutation.error as Error | null) ??
    (placeBetMutation.error as Error | null) ??
    (claimMutation.error as Error | null) ??
    (marketsQuery.error as Error | null) ??
    null;

  return {
    markets,
    getMarketById: (marketId: string) => markets.find((market) => market.marketId === marketId),
    createMarket: createMarketMutation.mutateAsync,
    placeBet: placeBetMutation.mutateAsync,
    claimWinnings: claimMutation.mutateAsync,
    fetchNext: async () => undefined,
    hasMore: false,
    isLoading: marketsQuery.isLoading,
    isCreating: createMarketMutation.isPending,
    isBetting: placeBetMutation.isPending,
    isClaiming: claimMutation.isPending,
    error,
    refetch: marketsQuery.refetch,
  };
}
