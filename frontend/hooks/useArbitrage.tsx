// frontend/hooks/useArbitrage.ts
"use client";

import { useEffect, useState } from "react";

export interface ArbitrageOpportunity {
  opportunityId: string;
  route: string[];
  spread: number;
  confidence: number;
  status: "ACTIVE" | "EXECUTED" | "EXPIRED";
  detectedAt: number;
}

export function useArbitrage() {
  const [feed, setFeed] = useState<ArbitrageOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchFeed() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/yield/arbitrage", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch arbitrage feed");
        }

        const raw = await res.json();

        const normalized: ArbitrageOpportunity[] = raw.map(
          (item: any): ArbitrageOpportunity => ({
            opportunityId: item.opportunityId,
            route: item.route ?? [],
            spread: Number(item.spread),
            confidence: Number(item.confidence),
            status: item.status,
            detectedAt: item.detectedAt ?? Date.now(),
          })
        );

        setFeed(normalized);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeed();
  }, []);

  return {
    feed,
    isLoading,
    error,
  };
}
