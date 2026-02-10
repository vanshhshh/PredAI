// File: frontend/app/governance/proposals/page.tsx

/**
 * PURPOSE
 * -------
 * Governance proposals index page.
 *
 * This page:
 * - lists all active and past DAO proposals
 * - shows status, quorum, and voting windows
 * - links to proposal detail / voting flows
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - Read-heavy, governance-safe UI
 * - Clear status signaling (active, passed, failed)
 * - Defensive UX (loading, error, empty)
 */

"use client";

import React from "react";

import { useGovernance } from "../../../hooks/useGovernance";

import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";

import { ProposalCard } from "../../../components/Governance/ProposalCard";

export default function GovernanceProposalsPage() {
  return (
    <ErrorBoundary>
      <ProposalsContent />
    </ErrorBoundary>
  );
}

function ProposalsContent() {
  const {
    proposals,
    isLoading,
    error,
  } = useGovernance();

  // ------------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------------

  if (isLoading) {
    return <LoadingSpinner label="Loading proposals…" />;
  }

  // ------------------------------------------------------------------
  // ERROR
  // ------------------------------------------------------------------

  if (error) {
    return (
      <div className="p-6 border rounded-md bg-red-50">
        <h3 className="font-semibold text-red-700">
          Failed to load proposals
        </h3>
        <p className="text-sm text-red-600 mt-2">{error.message}</p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // EMPTY
  // ------------------------------------------------------------------

  if (!proposals || proposals.length === 0) {
    return (
      <div className="p-6 border rounded-md bg-gray-50">
        <h3 className="font-semibold">No proposals</h3>
        <p className="text-sm text-gray-600 mt-2">
          There are currently no governance proposals.
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
        <h1 className="text-2xl font-semibold">Governance Proposals</h1>
        <p className="text-sm text-gray-600 mt-1">
          Participate in protocol governance and parameter updates.
        </p>
      </header>

      <div className="space-y-4">
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.proposalId}
            proposal={proposal}
          />
        ))}
      </div>
    </main>
  );
}
