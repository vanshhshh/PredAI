"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { burnRwaAsset, fetchRwaAssets, mintRwaAsset } from "@/lib/api";

export interface RWAAsset {
  assetId: string;
  symbol: string;
  name: string;
  chainId: number | null;
  underlyingMarketId?: string;
  supply: number;
  price: number | null;
  metadataUri?: string;
}

export interface MintRWAInput {
  assetId: string;
  amount: number;
}

export interface BurnRWAInput {
  assetId: string;
  amount: number;
}

export function useRWA() {
  const queryClient = useQueryClient();
  const assetsQuery = useQuery({
    queryKey: ["rwa", "assets"],
    queryFn: fetchRwaAssets,
  });

  const mintMutation = useMutation({
    mutationFn: async (input: MintRWAInput) => mintRwaAsset(input.assetId, input.amount),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rwa", "assets"] });
    },
  });

  const burnMutation = useMutation({
    mutationFn: async (input: BurnRWAInput) => burnRwaAsset(input.assetId, input.amount),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rwa", "assets"] });
    },
  });

  const error =
    (mintMutation.error as Error | null) ??
    (burnMutation.error as Error | null) ??
    (assetsQuery.error as Error | null) ??
    null;

  return {
    assets: (assetsQuery.data ?? []) as RWAAsset[],
    isLoading: assetsQuery.isLoading,
    isMutating: mintMutation.isPending || burnMutation.isPending,
    error,
    refetch: assetsQuery.refetch,
    mint: mintMutation.mutateAsync,
    burn: burnMutation.mutateAsync,
  };
}
