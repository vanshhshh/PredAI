"use client";

import React, { useMemo } from "react";

import { ArbitrageFeed } from "../../../components/Yield/ArbitrageFeed";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { useArbitrage } from "../../../hooks/useArbitrage";

export default function ArbitragePage() {
  return (
    <ErrorBoundary>
      <ArbitrageContent />
    </ErrorBoundary>
  );
}

function ArbitrageContent() {
  const { feed, isLoading, error } = useArbitrage();

  const feedForUI: {
    opportunityId: string;
    route: string;
    spread: number;
    confidence: number;
    status: "OPEN" | "EXECUTED" | "EXPIRED";
  }[] = (feed ?? []).map((item) => {
    let mappedStatus: "OPEN" | "EXECUTED" | "EXPIRED";

    if (item.status === "ACTIVE") {
      mappedStatus = "OPEN";
    } else if (item.status === "EXECUTED") {
      mappedStatus = "EXECUTED";
    } else {
      mappedStatus = "EXPIRED";
    }

    return {
      opportunityId: item.opportunityId,
      route: Array.isArray(item.route) ? item.route.join(" -> ") : item.route,
      spread: item.spread,
      confidence: item.confidence,
      status: mappedStatus,
    };
  });

  const stats = useMemo(() => {
    const open = feedForUI.filter((item) => item.status === "OPEN").length;
    const avgSpread =
      feedForUI.reduce((sum, item) => sum + item.spread, 0) /
      Math.max(feedForUI.length, 1);
    const avgConfidence =
      feedForUI.reduce((sum, item) => sum + item.confidence, 0) /
      Math.max(feedForUI.length, 1);

    return {
      open,
      avgSpread,
      avgConfidence,
    };
  }, [feedForUI]);

  if (isLoading) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Scanning markets for arbitrage..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-container py-14">
        <MessageCard title="Arbitrage engine unavailable" message={error.message} tone="error" />
      </section>
    );
  }

  if (!feed?.length) {
    return (
      <section className="page-container py-14">
        <MessageCard
          title="No arbitrage signals"
          message="Agents are actively scanning, but no significant spreads are open."
          tone="neutral"
        />
      </section>
    );
  }

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="ui-kicker">Arbitrage Radar</p>
            <h1 className="mt-1 text-3xl font-semibold text-white">Live Opportunity Feed</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Real-time spread and confidence stream detected by autonomous
              execution agents.
            </p>
          </div>
          <span className="ui-badge border-emerald-300/30 bg-emerald-400/15 text-emerald-100">
            <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
            Live
          </span>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Open Opportunities" value={stats.open.toString()} />
        <StatCard label="Average Spread" value={`${stats.avgSpread.toFixed(2)}%`} />
        <StatCard
          label="Average Confidence"
          value={`${(stats.avgConfidence * 100).toFixed(1)}%`}
        />
      </section>

      <section className="ui-card p-5">
        <ArbitrageFeed feed={feedForUI} />
      </section>
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
  tone: "error" | "neutral";
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
