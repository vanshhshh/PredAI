"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchPaperMarkets,
  fetchPaperPerformance,
  fetchPaperPredictions,
  ingestPolymarketPaper,
  runPolymarketPaper,
} from "@/lib/api";


const PAPER_AGENT_ID = "moltmarket-paper-ai-v1";


export function usePaperTrading() {
  const queryClient = useQueryClient();

  const marketsQuery = useQuery({
    queryKey: ["paper-markets"],
    queryFn: fetchPaperMarkets,
    refetchInterval: 60_000,
  });

  const predictionsQuery = useQuery({
    queryKey: ["paper-predictions", PAPER_AGENT_ID],
    queryFn: () => fetchPaperPredictions(PAPER_AGENT_ID),
    refetchInterval: 60_000,
  });

  const performanceQuery = useQuery({
    queryKey: ["paper-performance", PAPER_AGENT_ID],
    queryFn: () => fetchPaperPerformance(PAPER_AGENT_ID),
    refetchInterval: 60_000,
  });

  const ingestMutation = useMutation({
    mutationFn: () => ingestPolymarketPaper(500),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["paper-markets"] });
    },
  });

  const runMutation = useMutation({
    mutationFn: () => runPolymarketPaper(PAPER_AGENT_ID, 500),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["paper-markets"] }),
        queryClient.invalidateQueries({ queryKey: ["paper-predictions", PAPER_AGENT_ID] }),
        queryClient.invalidateQueries({ queryKey: ["paper-performance", PAPER_AGENT_ID] }),
      ]);
    },
  });

  return {
    agentId: PAPER_AGENT_ID,
    markets: marketsQuery.data ?? [],
    predictions: predictionsQuery.data ?? [],
    performance: performanceQuery.data ?? null,
    isLoading: marketsQuery.isLoading || predictionsQuery.isLoading || performanceQuery.isLoading,
    isMutating: ingestMutation.isPending || runMutation.isPending,
    error:
      (marketsQuery.error as Error | null) ??
      (predictionsQuery.error as Error | null) ??
      (performanceQuery.error as Error | null) ??
      (ingestMutation.error as Error | null) ??
      (runMutation.error as Error | null) ??
      null,
    ingest: ingestMutation.mutateAsync,
    run: runMutation.mutateAsync,
  };
}
