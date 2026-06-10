"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { burnRwaAsset, fetchRwaAssets, mintRwaAsset } from "@/lib/api";
import { rwaEnabled } from "@/lib/features";

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
  account: string;
  amount: number;
  txHash: string;
}

export interface BurnRWAInput {
  assetId: string;
  account: string;
  amount: number;
  txHash: string;
}

export function useRWA() {
  const queryClient = useQueryClient();
  const assetsQuery = useQuery({
    queryKey: ["rwa", "assets"],
    queryFn: fetchRwaAssets,
    enabled: rwaEnabled,
  });

  const mintMutation = useMutation({
    mutationFn: async (input: MintRWAInput) => {
      if (!rwaEnabled) {
        throw new Error("RWA minting is not enabled.");
      }
      return mintRwaAsset(input.assetId, input.account, input.amount, input.txHash);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rwa", "assets"] });
    },
  });

  const burnMutation = useMutation({
    mutationFn: async (input: BurnRWAInput) => {
      if (!rwaEnabled) {
        throw new Error("RWA burning is not enabled.");
      }
      return burnRwaAsset(input.assetId, input.account, input.amount, input.txHash);
    },
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
    isEnabled: rwaEnabled,
    assets: (assetsQuery.data ?? []) as RWAAsset[],
    isLoading: assetsQuery.isLoading,
    isMutating: mintMutation.isPending || burnMutation.isPending,
    error,
    refetch: assetsQuery.refetch,
    mint: mintMutation.mutateAsync,
    burn: burnMutation.mutateAsync,
  };
}
