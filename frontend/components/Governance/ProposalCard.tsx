"use client";

import Link from "next/link";
import React from "react";

interface Proposal {
  proposalId: string;
  title: string;
  status: "ACTIVE" | "PASSED" | "REJECTED" | "EXECUTED";
  startTime: number;
  endTime: number;
  forVotes: number;
  againstVotes: number;
  quorum: number;
}

interface ProposalCardProps {
  proposal: Proposal;
  showOutcome?: boolean;
}

export function ProposalCard({ proposal, showOutcome = false }: ProposalCardProps) {
  const totalVotes = proposal.forVotes + proposal.againstVotes;
  const quorumPercent =
    proposal.quorum > 0 ? Math.min(100, (totalVotes / proposal.quorum) * 100) : 0;

  return (
    <Link
      href={`/governance/proposals/${proposal.proposalId}`}
      className="ui-card fade-in-up block p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/45"
      aria-label={`Open proposal ${proposal.title}`}
    >
      <div className="space-y-4">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">{proposal.title}</h3>
            <p className="mt-1 text-xs text-slate-400">
              {new Date(proposal.startTime).toLocaleDateString()} to{" "}
              {new Date(proposal.endTime).toLocaleDateString()}
            </p>
          </div>
          <StatusBadge status={proposal.status} />
        </header>

        <div className="grid grid-cols-2 gap-3">
          <VoteMetric label="For" value={proposal.forVotes} tone="positive" />
          <VoteMetric label="Against" value={proposal.againstVotes} tone="negative" />
        </div>

        <section className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Quorum Progress</span>
            <span className="font-medium">{quorumPercent.toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-950/45">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
              style={{ width: `${quorumPercent}%` }}
            />
          </div>
          {showOutcome && (
            <p className="text-[11px] text-slate-400">
              Required quorum: {proposal.quorum.toLocaleString()}
            </p>
          )}
        </section>
      </div>
    </Link>
  );
}

function VoteMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/35 p-3 text-sm">
      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p
        className={`mt-1 text-base font-semibold ${
          tone === "positive" ? "text-emerald-200" : "text-rose-200"
        }`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: Proposal["status"] }) {
  const styles: Record<Proposal["status"], string> = {
    ACTIVE: "border-cyan-300/30 bg-cyan-400/15 text-cyan-100",
    PASSED: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
    REJECTED: "border-rose-300/30 bg-rose-400/15 text-rose-100",
    EXECUTED: "border-violet-300/30 bg-violet-400/15 text-violet-100",
  };

  return <span className={`ui-badge ${styles[status]}`}>{status}</span>;
}
