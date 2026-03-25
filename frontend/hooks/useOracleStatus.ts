"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchOracleStatus } from "@/lib/api";

export interface OracleSubmission {
  oracleId: string;
  outcome: "YES" | "NO";
  weight: number;
}

export interface OracleStatus {
  phase: "COLLECTING" | "FINALIZING" | "RESOLVED";
  confidence: number;
  quorumReached: boolean;
  submissions: OracleSubmission[];
  resolvedAt?: number;
  finalOutcome?: "YES" | "NO";
}

function getPollIntervalMs(): number | false {
  const raw = process.env.NEXT_PUBLIC_ORACLE_POLL_INTERVAL_MS ?? "0";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : false;
}

export function useOracleStatus(marketId?: string) {
  const query = useQuery({
    queryKey: ["oracles", "status", marketId ?? null],
    queryFn: async () => {
      if (!marketId) {
        return null;
      }

      return (await fetchOracleStatus(marketId)) as unknown as OracleStatus;
    },
    enabled: Boolean(marketId),
    refetchInterval: getPollIntervalMs(),
  });

  return {
    status: (query.data ?? null) as OracleStatus | null,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error: (query.error as Error | null) ?? null,
    refetch: query.refetch,
  };
}
