// File: frontend/hooks/useAgents.ts

"use client";

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractAddresses, sendContractTx, toWeiAmount } from "../lib/evmTx";
import { useWallet } from "./useWallet";

export interface Agent {
  agentId: string;
  owner: string;
  active: boolean;
  stake: number;
  accuracy: number; // 0..1
  pnl: number | null;
  trades: number | null;
  createdAt?: number;
  nftTokenId?: string;
  metadataUri?: string;
}

export interface CreateAgentInput {
  name: string;
  riskTolerance: number;
  maxExposure: number;
  metadataUri?: string;
}

export interface StakeInput {
  agentId: string;
  amount: number;
}

const AGENT_REGISTRY_ABI = [
  "function registerAgent(bytes32 agentId, string metadataURI)",
  "function stakeAndActivate() payable",
  "function deactivate()",
  "function unstake(uint256 amount)",
];

function slugifyAgentId(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    throw new Error("Agent name must contain at least one alphanumeric character");
  }
  return slug;
}

function encodeDataJson(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const encoded = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of encoded) {
    binary += String.fromCharCode(byte);
  }
  return `data:application/json;base64,${btoa(binary)}`;
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
  const { address } = useWallet();

  // ------------------------------------------------------------------
  // FETCH ALL AGENT DATA
  // ------------------------------------------------------------------

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const query = address
        ? `?wallet=${encodeURIComponent(address)}`
        : "";
      const res = await fetch(`/api/agents${query}`, {
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
  }, [address]);

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
        const agentId = slugifyAgentId(input.name);
        const metadataUri =
          input.metadataUri?.trim() ||
          encodeDataJson({
            agentId,
            name: input.name.trim(),
            riskTolerance: input.riskTolerance,
            maxExposure: input.maxExposure,
            schema: "moltmarket.agent.metadata.v1",
          });

        const txHash = await sendContractTx({
          address: contractAddresses.agentRegistry,
          abi: AGENT_REGISTRY_ABI,
          functionName: "registerAgent",
          args: [ethers.id(agentId), metadataUri],
          label: "AgentRegistry",
        });

        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CREATE_AGENT",
            payload: {
              agentId,
              metadataUri,
              txHash,
            },
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
        const amountWei = toWeiAmount(input.amount);
        const txHash = await sendContractTx({
          address: contractAddresses.agentRegistry,
          abi: AGENT_REGISTRY_ABI,
          functionName: "stakeAndActivate",
          args: [],
          valueWei: amountWei,
          label: "AgentRegistry",
        });

        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "STAKE_AGENT",
            payload: {
              agentId: input.agentId,
              amount: amountWei.toString(),
              txHash,
            },
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
        const amountWei = toWeiAmount(input.amount);
        const txHash = await sendContractTx({
          address: contractAddresses.agentRegistry,
          abi: AGENT_REGISTRY_ABI,
          functionName: "unstake",
          args: [amountWei],
          label: "AgentRegistry",
        });

        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UNSTAKE_AGENT",
            payload: {
              agentId: input.agentId,
              amount: amountWei.toString(),
              txHash,
            },
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
        const txHash = await sendContractTx({
          address: contractAddresses.agentRegistry,
          abi: AGENT_REGISTRY_ABI,
          functionName: "deactivate",
          args: [],
          label: "AgentRegistry",
        });

        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "TOGGLE_ACTIVE",
            payload: { agentId, txHash },
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
