// File: frontend/app/governance/history/page.tsx

/**
 * PURPOSE
 * -------
 * Governance proposal history page.
 *
 * This page:
 * - shows finalized governance proposals
 * - exposes voting outcomes and execution status
 * - acts as an immutable governance audit trail
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - Read-only, audit-focused UI
 * - Clear status + outcome visibility
 * - Defensive UX (loading, error, empty)
 */

"use client";

import React from "react";

import { useGovernance } from "../../../hooks/useGovernance";

import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";

import { ProposalCard } from "../../../components/Governance/ProposalCard";

export default function GovernanceHistoryPage() {
  return (
    <ErrorBoundary>
      <HistoryContent />
    </ErrorBoundary>
  );
}

function HistoryContent() {
  const {
    historicalProposals,
    isLoading,
    error,
  } = useGovernance();

  // ------------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------------

  if (isLoading) {
    return <LoadingSpinner label="Loading governance history…" />;
  }

  // ------------------------------------------------------------------
  // ERROR
  // ------------------------------------------------------------------

  if (error) {
    return (
      <div className="p-6 border rounded-md bg-red-50">
        <h3 className="font-semibold text-red-700">
          Failed to load governance history
        </h3>
        <p className="text-sm text-red-600 mt-2">{error.message}</p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // EMPTY
  // ------------------------------------------------------------------

  if (!historicalProposals || historicalProposals.length === 0) {
    return (
      <div className="p-6 border rounded-md bg-gray-50">
        <h3 className="font-semibold">No historical proposals</h3>
        <p className="text-sm text-gray-600 mt-2">
          No governance proposals have been finalized yet.
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // MAIN
  // ------------------------------------------------------------------

  return (
    <main className="px-6 py-8 space-y-8 max-w-5xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold">Governance History</h1>
        <p className="text-sm text-gray-600 mt-1">
          Completed governance proposals and outcomes.
        </p>
      </header>

      <div className="space-y-4">
        {historicalProposals.map((proposal) => (
          <ProposalCard
            key={proposal.proposalId}
            proposal={proposal}
            showOutcome
          />
        ))}
      </div>
    </main>
  );
}
