// File: frontend/hooks/useAgents.ts

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface Agent {
  agentId: string;
  owner: string;
  active: boolean;
  stake: number;
  accuracy: number; // 0..1
  pnl: number;
  trades: number;
  nftTokenId?: string;
  metadataUri?: string;
}

export interface CreateAgentInput {
  name: string;
  riskTolerance: number;
  maxExposure: number;
}

export interface StakeInput {
  agentId: string;
  amount: number;
}

export function useAgents() {
  // ------------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------------

  const [agents, setAgents] = useState<Agent[]>([]);
  const [marketplaceAgents, setMarketplaceAgents] =
    useState<Agent[]>([]);
  const [myAgents, setMyAgents] = useState<Agent[]>([]);
  const [delegatedAgents, setDelegatedAgents] =
    useState<Agent[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // ------------------------------------------------------------------
  // FETCH ALL AGENT DATA
  // ------------------------------------------------------------------

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/agents", {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch agents");
      }

      const data = await res.json();

      /**
       * Expected backend response:
       * {
       *   all: Agent[],
       *   marketplace: Agent[],
       *   mine: Agent[],
       *   delegated: Agent[]
       * }
       */

      setAgents(data.all ?? []);
      setMarketplaceAgents(data.marketplace ?? []);
      setMyAgents(data.mine ?? []);
      setDelegatedAgents(data.delegated ?? []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // ------------------------------------------------------------------
  // DERIVED HELPERS
  // ------------------------------------------------------------------

  const getAgentById = useCallback(
    (agentId: string): Agent | undefined => {
      return agents.find((a) => a.agentId === agentId);
    },
    [agents]
  );

  // ------------------------------------------------------------------
  // CREATE AGENT
  // ------------------------------------------------------------------

  const createAgent = useCallback(
    async (input: CreateAgentInput) => {
      setIsMutating(true);
      setError(null);

      try {
        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CREATE_AGENT",
            payload: input,
          }),
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        await fetchAgents();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchAgents]
  );

  // ------------------------------------------------------------------
  // STAKE / UNSTAKE
  // ------------------------------------------------------------------

  const stakeAgent = useCallback(
    async (input: StakeInput) => {
      setIsMutating(true);
      setError(null);

      try {
        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "STAKE_AGENT",
            payload: input,
          }),
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        await fetchAgents();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchAgents]
  );

  const unstakeAgent = useCallback(
    async (input: StakeInput) => {
      setIsMutating(true);
      setError(null);

      try {
        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UNSTAKE_AGENT",
            payload: input,
          }),
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        await fetchAgents();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchAgents]
  );

  // ------------------------------------------------------------------
  // TOGGLE ACTIVE
  // ------------------------------------------------------------------

  const toggleAgentActive = useCallback(
    async (agentId: string) => {
      setIsMutating(true);
      setError(null);

      try {
        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "TOGGLE_ACTIVE",
            payload: { agentId },
          }),
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        await fetchAgents();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [fetchAgents]
  );

  // ------------------------------------------------------------------
  // PUBLIC API (STABLE CONTRACT)
  // ------------------------------------------------------------------

  return {
    // data
    agents,
    marketplaceAgents,
    myAgents,
    delegatedAgents,

    // helpers
    getAgentById,

    // status
    isLoading,
    isMutating,
    isCreating: isMutating,
    error,

    // actions
    refetch: fetchAgents,
    createAgent,
    stakeAgent,
    unstakeAgent,
    toggleAgentActive,
  };
}
