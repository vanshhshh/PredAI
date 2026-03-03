"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";

import { VoteForm } from "../../../../components/Governance/VoteForm";
import { ErrorBoundary } from "../../../../components/Shared/ErrorBoundary";
import { LoadingSpinner } from "../../../../components/Shared/LoadingSpinner";
import { useGovernance } from "../../../../hooks/useGovernance";

export default function ProposalDetailPage() {
  return (
    <ErrorBoundary>
      <ProposalDetailContent />
    </ErrorBoundary>
  );
}

function ProposalDetailContent() {
  const params = useParams();
  const proposalId = params?.id as string | undefined;

  const { proposals, votingPower, isLoading, isSubmitting, error, vote } = useGovernance();

  if (!proposalId) {
    return (
      <section className="page-container py-14">
        <MessageCard title="Invalid proposal" message="Proposal identifier is missing." tone="error" />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Loading proposal..." />
      </section>
    );
  }

  const proposal = proposals.find((item) => item.proposalId === proposalId);
  if (!proposal) {
    return (
      <section className="page-container py-14">
        <MessageCard title="Proposal not found" message="This proposal does not exist." tone="error" />
      </section>
    );
  }

  const totalVotes = proposal.forVotes + proposal.againstVotes;
  const quorumProgress =
    proposal.quorum > 0 ? Math.min(100, (totalVotes / proposal.quorum) * 100) : 0;

  async function handleVote(payload: { support: "FOR" | "AGAINST"; weight: number }) {
    await vote({
      proposalId: proposalId!,
      support: payload.support,
      weight: payload.weight,
    });
  }

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="ui-kicker">Proposal Detail</p>
            <h1 className="mt-1 text-3xl font-semibold text-white">{proposal.title}</h1>
            <p className="mt-2 text-sm text-slate-300">
              Voting window: {new Date(proposal.startTime).toLocaleString()} to{" "}
              {new Date(proposal.endTime).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/governance/proposals" className="ui-btn ui-btn-secondary">
              Back to Proposals
            </Link>
            <Link href="/governance/history" className="ui-btn ui-btn-secondary">
              Governance Ledger
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-[0.62fr_0.38fr]">
        <article className="ui-card space-y-4 p-5">
          <h2 className="text-lg font-semibold text-white">Voting Status</h2>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="For Votes" value={proposal.forVotes.toLocaleString()} />
            <StatCard label="Against Votes" value={proposal.againstVotes.toLocaleString()} />
            <StatCard label="Quorum" value={proposal.quorum.toLocaleString()} />
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Quorum Progress</span>
              <span>{quorumProgress.toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950/45">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                style={{ width: `${quorumProgress}%` }}
              />
            </div>
          </div>

          <article className="rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-300">
            <p className="ui-kicker">Status</p>
            <p className="mt-1 text-base font-semibold text-slate-100">{proposal.status}</p>
          </article>
        </article>

        <aside className="space-y-4">
          {proposal.status === "ACTIVE" ? (
            <VoteForm
              proposalId={proposal.proposalId}
              votingPower={votingPower}
              onVote={handleVote}
              isSubmitting={isSubmitting}
              error={error}
            />
          ) : (
            <MessageCard
              title="Voting closed"
              message="This proposal is no longer active for voting."
              tone="neutral"
            />
          )}
        </aside>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
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
    <article className="ui-card p-6">
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
