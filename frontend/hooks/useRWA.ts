// File: frontend/hooks/useRWA.ts

/**
 * PURPOSE
 * -------
 * Real-World Asset (RWA) abstraction hook.
 *
 * This hook:
 * - fetches tokenized RWA instruments (outcomes, yield-backed assets)
 * - handles cross-chain wrapped outcomes
 * - exposes mint / burn / transfer–intent actions (no signing here)
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Backend + contracts are the source of truth
 * - No mock data
 * - Chain-agnostic interface (EVM first, extensible)
 * - Deterministic, auditable state
 */

"use client";

import { useCallback, useEffect, useState } from "react";

export interface RWAAsset {
  assetId: string;
  symbol: string;
  name: string;
  chainId: number;
  underlyingMarketId?: string;
  supply: number;
  price: number;
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
  const [assets, setAssets] = useState<RWAAsset[]>([]);
  const [isLoading, setIsLoading] =
    useState<boolean>(false);
  const [isMutating, setIsMutating] =
    useState<boolean>(false);
  const [error, setError] = useState<Error | null>(
    null
  );

  // ------------------------------------------------------------------
  // FETCH ASSETS
  // ------------------------------------------------------------------

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/rwa/assets", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch RWA assets");
      }

      const data = await res.json();
      setAssets(data.assets ?? data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // ------------------------------------------------------------------
  // MINT
  // ------------------------------------------------------------------

  const mint = useCallback(
    async (input: MintRWAInput) => {
      setIsMutating(true);
      setError(null);

      try {
        const res = await fetch("/api/rwa/mint", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            text || "Failed to mint RWA"
          );
        }

        await fetchAssets();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchAssets]
  );

  // ------------------------------------------------------------------
  // BURN
  // ------------------------------------------------------------------

  const burn = useCallback(
    async (input: BurnRWAInput) => {
      setIsMutating(true);
      setError(null);

      try {
        const res = await fetch("/api/rwa/burn", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            text || "Failed to burn RWA"
          );
        }

        await fetchAssets();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchAssets]
  );

  // ------------------------------------------------------------------
  // PUBLIC API
  // ------------------------------------------------------------------

  return {
    assets,

    isLoading,
    isMutating,
    error,

    refetch: fetchAssets,
    mint,
    burn,
  };
}
