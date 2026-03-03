"use client";

import React from "react";
import Link from "next/link";

import { ProposalCard } from "../../../components/Governance/ProposalCard";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { useGovernance } from "../../../hooks/useGovernance";

export default function GovernanceProposalsPage() {
  return (
    <ErrorBoundary>
      <ProposalsContent />
    </ErrorBoundary>
  );
}

function ProposalsContent() {
  const { proposals, isLoading, error } = useGovernance();

  if (isLoading) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Loading governance proposals..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-container py-14">
        <MessageCard title="Governance unavailable" message={error.message} tone="error" />
      </section>
    );
  }

  if (!proposals?.length) {
    return (
      <section className="page-container py-14">
        <MessageCard
          title="No active proposals"
          message="Governance proposals will appear here when submitted."
          tone="neutral"
        />
      </section>
    );
  }

  const active = proposals.filter((proposal) => proposal.status === "ACTIVE");
  const completed = proposals.filter((proposal) => proposal.status !== "ACTIVE");

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="ui-kicker">DAO Control Plane</p>
            <h1 className="mt-1 text-3xl font-semibold text-white">Protocol Governance</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Review active motions, inspect voting progress, and participate in
              protocol evolution.
            </p>
          </div>
          <Link href="/governance/create" className="ui-btn ui-btn-primary">
            Submit Proposal
          </Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Active" value={active.length.toString()} />
        <StatCard label="Completed" value={completed.length.toString()} />
        <StatCard label="Total" value={proposals.length.toString()} />
      </section>

      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Active Proposals</h2>
          <div className="space-y-3">
            {active.map((proposal) => (
              <ProposalCard key={proposal.proposalId} proposal={proposal} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Completed Proposals</h2>
          <div className="space-y-3">
            {completed.map((proposal) => (
              <ProposalCard key={proposal.proposalId} proposal={proposal} showOutcome />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="ui-stat">
      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
    </article>
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
