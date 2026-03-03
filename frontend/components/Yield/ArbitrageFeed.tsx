"use client";

import React from "react";

interface ArbitrageOpportunity {
  opportunityId: string;
  route: string;
  spread: number;
  confidence: number;
  status: "OPEN" | "EXECUTED" | "EXPIRED";
}

interface ArbitrageFeedProps {
  feed: ArbitrageOpportunity[];
}

export function ArbitrageFeed({ feed }: ArbitrageFeedProps) {
  if (!feed?.length) {
    return (
      <div className="ui-card-soft rounded-xl p-4 text-sm text-slate-300">
        No active arbitrage opportunities right now.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feed.map((opportunity) => (
        <OpportunityRow key={opportunity.opportunityId} opportunity={opportunity} />
      ))}
    </div>
  );
}

function OpportunityRow({ opportunity }: { opportunity: ArbitrageOpportunity }) {
  const confidencePercent = Math.round(opportunity.confidence * 100);
  const confidenceTone =
    confidencePercent >= 70
      ? "bg-emerald-400"
      : confidencePercent >= 50
      ? "bg-amber-300"
      : "bg-rose-400";

  return (
    <article className="ui-card-soft rounded-xl p-4 transition hover:border-cyan-300/35">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-100">{opportunity.route}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="rounded-md border border-emerald-300/25 bg-emerald-400/10 px-2 py-1">
              Spread {opportunity.spread.toFixed(2)}%
            </span>
            <StatusBadge status={opportunity.status} />
          </div>
        </div>

        <div className="w-full sm:w-44">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Confidence</span>
            <span>{confidencePercent}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-950/45">
            <div className={`h-full rounded-full ${confidenceTone}`} style={{ width: `${confidencePercent}%` }} />
          </div>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: ArbitrageOpportunity["status"] }) {
  const styles: Record<ArbitrageOpportunity["status"], string> = {
    OPEN: "border-cyan-300/30 bg-cyan-400/15 text-cyan-100",
    EXECUTED: "border-emerald-300/30 bg-emerald-400/15 text-emerald-100",
    EXPIRED: "border-slate-300/20 bg-slate-400/15 text-slate-300",
  };

  return <span className={`ui-badge ${styles[status]}`}>{status}</span>;
}
