"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ethers } from "ethers";

import {
  createAgentRecord,
  fetchAgents,
  stakeAgentRecord,
  toggleAgentRecord,
  unstakeAgentRecord,
} from "@/lib/api";
import { contractAddresses, sendContractTx, toWeiAmount } from "@/lib/evmTx";

import { useWallet } from "./useWallet";

export interface Agent {
  agentId: string;
  owner: string;
  active: boolean;
  stake: number;
  accuracy: number;
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

function getPollIntervalMs(): number | false {
  const raw = process.env.NEXT_PUBLIC_AGENTS_POLL_INTERVAL_MS ?? "30000";
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : false;
}

export function useAgents() {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const agentsQuery = useQuery({
    queryKey: ["agents", address ?? null],
    queryFn: () => fetchAgents(address),
    refetchInterval: getPollIntervalMs(),
  });

  const bucketed = agentsQuery.data ?? {
    all: [],
    marketplace: [],
    mine: [],
    delegated: [],
  };

  const createAgentMutation = useMutation({
    mutationFn: async (input: CreateAgentInput) => {
      if (bucketed.mine.length > 0) {
        throw new Error("Only one agent per wallet is currently supported.");
      }

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

      return createAgentRecord({
        agentId,
        metadataUri,
        txHash,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const stakeAgentMutation = useMutation({
    mutationFn: async (input: StakeInput) => {
      const amountWei = toWeiAmount(input.amount);
      const txHash = await sendContractTx({
        address: contractAddresses.agentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: "stakeAndActivate",
        args: [],
        valueWei: amountWei,
        label: "AgentRegistry",
      });

      return stakeAgentRecord({
        agentId: input.agentId,
        amount: amountWei.toString(),
        txHash,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const unstakeAgentMutation = useMutation({
    mutationFn: async (input: StakeInput) => {
      const amountWei = toWeiAmount(input.amount);
      const txHash = await sendContractTx({
        address: contractAddresses.agentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: "unstake",
        args: [amountWei],
        label: "AgentRegistry",
      });

      return unstakeAgentRecord({
        agentId: input.agentId,
        amount: amountWei.toString(),
        txHash,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const toggleAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const txHash = await sendContractTx({
        address: contractAddresses.agentRegistry,
        abi: AGENT_REGISTRY_ABI,
        functionName: "deactivate",
        args: [],
        label: "AgentRegistry",
      });

      return toggleAgentRecord({
        agentId,
        txHash,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });

  const error =
    (createAgentMutation.error as Error | null) ??
    (stakeAgentMutation.error as Error | null) ??
    (unstakeAgentMutation.error as Error | null) ??
    (toggleAgentMutation.error as Error | null) ??
    (agentsQuery.error as Error | null) ??
    null;

  return {
    agents: bucketed.all as Agent[],
    marketplaceAgents: bucketed.marketplace as Agent[],
    myAgents: bucketed.mine as Agent[],
    delegatedAgents: bucketed.delegated as Agent[],
    getAgentById: (agentId: string) => bucketed.all.find((agent) => agent.agentId === agentId),
    isLoading: agentsQuery.isLoading,
    isMutating:
      createAgentMutation.isPending ||
      stakeAgentMutation.isPending ||
      unstakeAgentMutation.isPending ||
      toggleAgentMutation.isPending,
    isCreating: createAgentMutation.isPending,
    error,
    refetch: agentsQuery.refetch,
    createAgent: createAgentMutation.mutateAsync,
    stakeAgent: stakeAgentMutation.mutateAsync,
    unstakeAgent: unstakeAgentMutation.mutateAsync,
    toggleAgentActive: toggleAgentMutation.mutateAsync,
  };
}
