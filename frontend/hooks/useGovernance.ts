"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createGovernanceProposal,
  fetchProposals,
  fetchVotingPower,
  voteOnProposal,
} from "@/lib/api";

import { useWallet } from "./useWallet";

export interface Proposal {
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

export interface CreateProposalInput {
  title: string;
  description: string;
  payload: Record<string, unknown>;
  proposer?: string;
}

export function useGovernance() {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const proposalsQuery = useQuery({
    queryKey: ["governance", "proposals"],
    queryFn: fetchProposals,
  });
  const votingPowerQuery = useQuery({
    queryKey: ["governance", "votingPower", address ?? null],
    queryFn: fetchVotingPower,
  });

  const voteMutation = useMutation({
    mutationFn: voteOnProposal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["governance", "proposals"] });
      await queryClient.invalidateQueries({ queryKey: ["governance", "votingPower"] });
    },
  });

  const createProposalMutation = useMutation({
    mutationFn: createGovernanceProposal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["governance", "proposals"] });
      await queryClient.invalidateQueries({ queryKey: ["governance", "votingPower"] });
    },
  });

  const proposals = (proposalsQuery.data ?? []) as Proposal[];
  const error =
    (voteMutation.error as Error | null) ??
    (createProposalMutation.error as Error | null) ??
    (proposalsQuery.error as Error | null) ??
    (votingPowerQuery.error as Error | null) ??
    null;

  return {
    proposals,
    historicalProposals: proposals.filter((proposal) => proposal.status !== "ACTIVE"),
    votingPower: votingPowerQuery.data ?? 0,
    isLoading: proposalsQuery.isLoading || votingPowerQuery.isLoading,
    isSubmitting: voteMutation.isPending || createProposalMutation.isPending,
    isCreating: createProposalMutation.isPending,
    error,
    refetch: proposalsQuery.refetch,
    vote: voteMutation.mutateAsync,
    createProposal: createProposalMutation.mutateAsync,
  };
}
