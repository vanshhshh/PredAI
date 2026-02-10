// File: frontend/state/slices/agentsSlice.ts

/**
 * PURPOSE
 * -------
 * Global agents state slice.
 *
 * This slice:
 * - stores all agents indexed by agentId
 * - tracks user-owned agents and marketplace visibility
 * - exposes pure state mutations only
 *
 * IMPORTANT
 * ---------
 * - No async logic
 * - No API calls
 * - Backend/hooks handle fetching & mutations
 */

import { StateCreator } from "zustand";

export interface AgentState {
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

export interface AgentsSlice {
  agents: Record<string, AgentState>;
  myAgentIds: string[];
  marketplaceAgentIds: string[];

  setAgents: (agents: AgentState[]) => void;
  setMyAgents: (agentIds: string[]) => void;
  setMarketplaceAgents: (agentIds: string[]) => void;
  updateAgent: (agent: AgentState) => void;
}

export const createAgentsSlice: StateCreator<
  AgentsSlice,
  [],
  [],
  AgentsSlice
> = (set) => ({
  agents: {},
  myAgentIds: [],
  marketplaceAgentIds: [],

  setAgents: (agents) => {
    const map: Record<string, AgentState> = {};
    for (const agent of agents) {
      map[agent.agentId] = agent;
    }
    set({ agents: map });
  },

  setMyAgents: (agentIds) => {
    set({ myAgentIds: agentIds });
  },

  setMarketplaceAgents: (agentIds) => {
    set({ marketplaceAgentIds: agentIds });
  },

  updateAgent: (agent) => {
    set((state) => ({
      agents: {
        ...state.agents,
        [agent.agentId]: agent,
      },
    }));
  },
});
