// File: frontend/hooks/useGovernance.ts

/**
 * PURPOSE
 * -------
 * Governance data + actions hook.
 *
 * This hook:
 * - fetches proposals, proposal history, and user voting power
 * - submits votes and new proposals
 * - exposes governance state in a UI-stable form
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Backend is the source of truth
 * - No mock data
 * - Explicit, auditable actions
 * - Separation of read vs write
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/* ------------------------------------------------------------------ */
/* TYPES */
/* ------------------------------------------------------------------ */

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
  proposer?: string; // wallet address (frontend-derived)
}

/* ------------------------------------------------------------------ */
/* HOOK */
/* ------------------------------------------------------------------ */

export function useGovernance() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votingPower, setVotingPower] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] =
    useState<boolean>(false);

  const [error, setError] = useState<Error | null>(null);

  /* ------------------------------------------------------------------ */
  /* FETCH PROPOSALS */
  /* ------------------------------------------------------------------ */

  const fetchProposals = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/governance/proposals", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch proposals");
      }

      const data = await res.json();
      setProposals(data.proposals ?? data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* ------------------------------------------------------------------ */
  /* FETCH VOTING POWER */
  /* ------------------------------------------------------------------ */

  const fetchVotingPower = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/governance/voting-power",
        { cache: "no-store" }
      );

      if (!res.ok) {
        throw new Error("Voting power unavailable");
      }

      const data = await res.json();
      setVotingPower(data.votingPower ?? 0);
    } catch {
      setVotingPower(0);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
    fetchVotingPower();
  }, [fetchProposals, fetchVotingPower]);

  /* ------------------------------------------------------------------ */
  /* DERIVED STATE */
  /* ------------------------------------------------------------------ */

  const historicalProposals = useMemo(() => {
    return proposals.filter(
      (p) => p.status !== "ACTIVE"
    );
  }, [proposals]);

  /* ------------------------------------------------------------------ */
  /* VOTE */
  /* ------------------------------------------------------------------ */

  const vote = useCallback(
    async (input: {
      proposalId: string;
      support: "FOR" | "AGAINST";
      weight: number;
    }) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const res = await fetch("/api/governance/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Vote failed");
        }

        await fetchProposals();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchProposals]
  );

  /* ------------------------------------------------------------------ */
  /* CREATE PROPOSAL */
  /* ------------------------------------------------------------------ */

  const createProposal = useCallback(
    async (input: CreateProposalInput) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const res = await fetch(
          "/api/governance/proposals",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            text || "Proposal creation failed"
          );
        }

        await fetchProposals();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchProposals]
  );

  /* ------------------------------------------------------------------ */
  /* PUBLIC API — STABLE CONTRACT */
  /* ------------------------------------------------------------------ */

  return {
    proposals,
    historicalProposals,
    votingPower,

    isLoading,
    isSubmitting,
    isCreating: isSubmitting, // semantic alias for UI

    error,

    refetch: fetchProposals,
    vote,
    createProposal,
  };
}
