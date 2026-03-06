"use client";

import React from "react";

import { FeedMonitor } from "../../../components/Social/FeedMonitor";
import { PromptCompiler } from "../../../components/Social/PromptCompiler";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { useSocialFeeds } from "../../../hooks/useSocialFeeds";
import { useWallet } from "../../../hooks/useWallet";

export default function SocialFeedsPage() {
  return (
    <ErrorBoundary>
      <SocialFeedsContent />
    </ErrorBoundary>
  );
}

function SocialFeedsContent() {
  const { isConnected } = useWallet();
  const { feeds, isLoading, isRefreshing, error, spawnMarketFromFeed, pollIntervalMs } =
    useSocialFeeds();

  if (isLoading && !feeds?.length) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Initializing signal monitoring..." />
      </section>
    );
  }

  if (error && !feeds?.length) {
    return (
      <section className="page-container py-14">
        <MessageCard title="Social stream unavailable" message={error.message} tone="error" />
      </section>
    );
  }

  if (!feeds?.length) {
    return (
      <section className="page-container py-14">
        <MessageCard
          title="No active social signals"
          message="Agents are online but no trending events are being tracked."
          tone="neutral"
        />
      </section>
    );
  }

  const marketOpportunities = feeds.filter(
    (feed) => typeof feed.signalScore === "number" && feed.signalScore > 0
  ).length;

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Social Intelligence</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Signal Monitor</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Track live social events, inspect AI confidence, and spawn markets from
          high-signal narratives.
        </p>
        <p className="mt-3 text-xs text-slate-400">
          {isRefreshing
            ? "Refreshing feed..."
            : pollIntervalMs > 0
            ? `Live polling every ${formatPollInterval(pollIntervalMs)}.`
            : "Polling is disabled for this deployment."}
        </p>
      </header>

      {error && (
        <section className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
          Feed refresh failed: {error.message}. Showing last known data.
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Active Feeds" value={feeds.length.toString()} />
        <StatCard label="Market Opportunities" value={marketOpportunities.toString()} />
        <StatCard label="Wallet Connected" value={isConnected ? "Yes" : "No"} />
      </section>

      <section className="ui-card p-5">
        <h2 className="text-lg font-semibold text-white">Live Feed Stream</h2>
        <p className="mt-1 text-sm text-slate-300">
          Feed events update continuously with confidence and eligibility status.
        </p>
        <div className="mt-4">
          <FeedMonitor feeds={feeds} onSpawnMarket={isConnected ? spawnMarketFromFeed : undefined} />
        </div>
      </section>

      <section className="ui-card p-5">
        <h2 className="text-lg font-semibold text-white">Prompt to Market Compiler</h2>
        <p className="mt-1 text-sm text-slate-300">
          Compile social context into structured market specs before launch.
        </p>
        <div className="mt-4">
          <PromptCompiler />
        </div>
      </section>
    </main>
  );
}

function formatPollInterval(ms: number): string {
  if (ms < 60_000) {
    return `${Math.max(1, Math.round(ms / 1000))} seconds`;
  }
  const minutes = Math.max(1, Math.round(ms / 60_000));
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
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
