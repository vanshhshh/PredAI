// File: frontend/state/slices/governanceSlice.ts

/**
 * PURPOSE
 * -------
 * Global governance state slice.
 *
 * This slice:
 * - stores governance proposals
 * - tracks user voting power
 * - exposes pure state updates only
 *
 * IMPORTANT
 * ---------
 * - No voting logic here
 * - No side effects
 * - DAO execution handled elsewhere
 */

import { StateCreator } from "zustand";

export interface GovernanceProposalState {
  proposalId: string;
  title: string;
  description?: string;
  status: "ACTIVE" | "PASSED" | "REJECTED" | "EXECUTED";
  startTime: number;
  endTime: number;
  forVotes: number;
  againstVotes: number;
  quorum: number;
}

export interface GovernanceSlice {
  proposals: Record<string, GovernanceProposalState>;
  votingPower: number;

  setProposals: (proposals: GovernanceProposalState[]) => void;
  updateProposal: (proposal: GovernanceProposalState) => void;
  setVotingPower: (power: number) => void;
}

export const createGovernanceSlice: StateCreator<
  GovernanceSlice,
  [],
  [],
  GovernanceSlice
> = (set) => ({
  proposals: {},
  votingPower: 0,

  setProposals: (proposals) => {
    const map: Record<string, GovernanceProposalState> = {};
    for (const p of proposals) {
      map[p.proposalId] = p;
    }
    set({ proposals: map });
  },

  updateProposal: (proposal) => {
    set((state) => ({
      proposals: {
        ...state.proposals,
        [proposal.proposalId]: proposal,
      },
    }));
  },

  setVotingPower: (power) => {
    set({ votingPower: power });
  },
});
