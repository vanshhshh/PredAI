"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchArbitrageOpportunities } from "@/lib/api";

export interface ArbitrageOpportunity {
  opportunityId: string;
  route: string[];
  spread: number;
  confidence: number;
  status: "ACTIVE" | "EXECUTED" | "EXPIRED";
  detectedAt: number;
}

export function useArbitrage() {
  const query = useQuery({
    queryKey: ["yield", "arbitrage"],
    queryFn: fetchArbitrageOpportunities,
  });

  return {
    feed: ((query.data ?? []) as Record<string, unknown>[]).map(
      (item): ArbitrageOpportunity => ({
        opportunityId: String(item.opportunityId ?? ""),
        route: Array.isArray(item.route) ? item.route.map((value) => String(value)) : [],
        spread: Number(item.spread ?? 0),
        confidence: Number(item.confidence ?? 0),
        status: (item.status as ArbitrageOpportunity["status"]) ?? "ACTIVE",
        detectedAt: Number(item.detectedAt ?? Date.now()),
      })
    ),
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
  };
}
