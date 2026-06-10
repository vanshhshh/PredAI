"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchYieldPortfolio,
  fetchYieldVaults,
  rebalanceYieldPortfolio,
} from "@/lib/api";
import { yieldEnabled } from "@/lib/features";

import { useWallet } from "./useWallet";

export interface YieldVault {
  vaultId: string;
  name: string;
  description?: string;
  apy: number;
  tvl: number;
  risk: number;
}

export interface PortfolioAllocation {
  vaultId: string;
  currentWeight: number;
  recommendedWeight: number;
  expectedApy: number;
}

export interface YieldPortfolio {
  totalValue: number;
  risk: number;
  allocations: PortfolioAllocation[];
}

export function useYield() {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const vaultsQuery = useQuery({
    queryKey: ["yield", "vaults"],
    queryFn: fetchYieldVaults,
    enabled: yieldEnabled,
  });
  const portfolioQuery = useQuery({
    queryKey: ["yield", "portfolio", address ?? null],
    queryFn: fetchYieldPortfolio,
    enabled: yieldEnabled,
  });

  const rebalanceMutation = useMutation({
    mutationFn: async () => {
      if (!yieldEnabled) {
        throw new Error("Yield routing is not enabled.");
      }
      return rebalanceYieldPortfolio();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["yield", "portfolio"] });
    },
  });

  const error =
    (rebalanceMutation.error as Error | null) ??
    (portfolioQuery.error as Error | null) ??
    (vaultsQuery.error as Error | null) ??
    null;

  return {
    isEnabled: yieldEnabled,
    vaults: (vaultsQuery.data ?? []) as YieldVault[],
    portfolio: (portfolioQuery.data ?? null) as YieldPortfolio | null,
    isLoading: vaultsQuery.isLoading || portfolioQuery.isLoading,
    isRebalancing: rebalanceMutation.isPending,
    error,
    refetchVaults: vaultsQuery.refetch,
    refetchPortfolio: portfolioQuery.refetch,
    rebalance: async () => {
      await rebalanceMutation.mutateAsync();
    },
  };
}
