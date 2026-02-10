// File: frontend/hooks/useYield.ts

/**
 * PURPOSE
 * -------
 * Yield ecosystem data + actions hook.
 *
 * This hook:
 * - fetches yield vaults and user portfolio state
 * - retrieves AI-optimized allocation recommendations
 * - triggers rebalance / allocation actions
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - Backend is the source of truth
 * - Deterministic, auditable actions
 * - Explicit separation of read vs write
 */

"use client";

import { useCallback, useEffect, useState } from "react";

export interface YieldVault {
  vaultId: string;
  name: string;
  description?: string;
  apy: number;
  tvl: number;
  risk: number; // 0..1
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
  const [vaults, setVaults] = useState<YieldVault[]>([]);
  const [portfolio, setPortfolio] =
    useState<YieldPortfolio | null>(null);

  const [isLoading, setIsLoading] =
    useState<boolean>(false);
  const [isRebalancing, setIsRebalancing] =
    useState<boolean>(false);
  const [error, setError] = useState<Error | null>(
    null
  );

  // ------------------------------------------------------------------
  // FETCH VAULTS
  // ------------------------------------------------------------------

  const fetchVaults = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/yield/vaults", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch vaults");
      }

      const data = await res.json();
      setVaults(data.vaults ?? data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // FETCH PORTFOLIO
  // ------------------------------------------------------------------

  const fetchPortfolio = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/yield/portfolio", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch portfolio");
      }

      const data = await res.json();
      setPortfolio(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVaults();
    fetchPortfolio();
  }, [fetchVaults, fetchPortfolio]);

  // ------------------------------------------------------------------
  // REBALANCE
  // ------------------------------------------------------------------

  const rebalance = useCallback(async () => {
    setIsRebalancing(true);
    setError(null);

    try {
      const res = await fetch("/api/yield/rebalance", {
        method: "POST",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          text || "Failed to rebalance portfolio"
        );
      }

      await fetchPortfolio();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsRebalancing(false);
    }
  }, [fetchPortfolio]);

  // ------------------------------------------------------------------
  // PUBLIC API
  // ------------------------------------------------------------------

  return {
    vaults,
    portfolio,

    isLoading,
    isRebalancing,
    error,

    refetchVaults: fetchVaults,
    refetchPortfolio: fetchPortfolio,
    rebalance,
  };
}
