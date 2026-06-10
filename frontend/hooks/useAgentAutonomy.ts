"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchAgentPerformance,
  fetchAgentPredictions,
  runAgentAutonomy,
} from "@/lib/api";


export function useAgentAutonomy(agentId?: string) {
  const queryClient = useQueryClient();
  const enabled = Boolean(agentId);

  const performanceQuery = useQuery({
    queryKey: ["agent-performance", agentId],
    queryFn: () => fetchAgentPerformance(agentId as string),
    enabled,
  });

  const predictionsQuery = useQuery({
    queryKey: ["agent-predictions", agentId],
    queryFn: () => fetchAgentPredictions(agentId as string),
    enabled,
  });

  const runMutation = useMutation({
    mutationFn: (executeLive: boolean) => runAgentAutonomy(agentId as string, executeLive),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agent-performance", agentId] }),
        queryClient.invalidateQueries({ queryKey: ["agent-predictions", agentId] }),
        queryClient.invalidateQueries({ queryKey: ["markets"] }),
      ]);
    },
  });

  return {
    performance: performanceQuery.data ?? null,
    predictions: predictionsQuery.data ?? [],
    isLoading: performanceQuery.isLoading || predictionsQuery.isLoading,
    isRunning: runMutation.isPending,
    error:
      (performanceQuery.error as Error | null) ??
      (predictionsQuery.error as Error | null) ??
      (runMutation.error as Error | null) ??
      null,
    runPaperCycle: () => runMutation.mutateAsync(false),
    runLiveCycle: () => runMutation.mutateAsync(true),
  };
}
