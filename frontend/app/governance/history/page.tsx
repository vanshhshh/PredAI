"use client";

import React from "react";

import { ProposalCard } from "../../../components/Governance/ProposalCard";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { useGovernance } from "../../../hooks/useGovernance";

export default function GovernanceHistoryPage() {
  return (
    <ErrorBoundary>
      <HistoryContent />
    </ErrorBoundary>
  );
}

function HistoryContent() {
  const { historicalProposals, isLoading, error } = useGovernance();

  if (isLoading) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Loading governance ledger..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-container py-14">
        <MessageCard title="Ledger unavailable" message={error.message} tone="error" />
      </section>
    );
  }

  if (!historicalProposals?.length) {
    return (
      <section className="page-container py-14">
        <MessageCard
          title="No finalized proposals"
          message="Proposal history will appear once outcomes are executed."
          tone="neutral"
        />
      </section>
    );
  }

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Governance Ledger</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Proposal History</h1>
        <p className="mt-2 text-sm text-slate-300">
          Immutable archive of finalized proposals and voting outcomes.
        </p>
      </header>

      <section className="space-y-3">
        {historicalProposals.map((proposal) => (
          <ProposalCard key={proposal.proposalId} proposal={proposal} showOutcome />
        ))}
      </section>
    </main>
  );
}

function MessageCard({
  title,
  message,
  tone,
}: {
  title: string;
  message: string;
  tone: "neutral" | "error";
}) {
  return (
    <article className="ui-card max-w-2xl p-6">
      <h2
        className={`text-lg font-semibold ${
          tone === "error" ? "text-rose-200" : "text-slate-100"
        }`}
      >
        {title}
      </h2>
      <p className={`mt-2 text-sm ${tone === "error" ? "text-rose-100" : "text-slate-300"}`}>
        {message}
      </p>
    </article>
  );
}
