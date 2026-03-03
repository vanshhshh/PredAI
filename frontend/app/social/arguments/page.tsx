"use client";

import React, { useMemo } from "react";

import { ArgumentStaker } from "../../../components/Social/ArgumentStaker";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { useSocialFeeds } from "../../../hooks/useSocialFeeds";
import { useWallet } from "../../../hooks/useWallet";

interface Argument {
  argumentId: string;
  text: string;
  confidence: number;
  totalStake: number;
  resolved: boolean;
}

export default function SocialArgumentsPage() {
  return (
    <ErrorBoundary>
      <ArgumentsContent />
    </ErrorBoundary>
  );
}

function ArgumentsContent() {
  const { isConnected } = useWallet();
  const { feeds, isLoading, error } = useSocialFeeds();

  const argumentsFeed: Argument[] = useMemo(() => {
    return feeds
      .filter((feed) => typeof feed.signalScore === "number" && feed.signalScore > 0)
      .map((feed) => ({
        argumentId: feed.id,
        text: feed.content,
        confidence: feed.signalScore ?? 0,
        totalStake: 0,
        resolved: false,
      }));
  }, [feeds]);

  if (isLoading) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Extracting reasoning signals..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-container py-14">
        <MessageCard title="Reasoning layer unavailable" message={error.message} tone="error" />
      </section>
    );
  }

  if (!argumentsFeed.length) {
    return (
      <section className="page-container py-14">
        <MessageCard
          title="No reasoning signals yet"
          message="AI and social streams have not produced stakeable arguments."
          tone="neutral"
        />
      </section>
    );
  }

  const averageConfidence =
    argumentsFeed.reduce((sum, item) => sum + item.confidence, 0) / argumentsFeed.length;

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Argument Markets</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Stake on Reasoning</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Evaluate machine and social reasoning signals, then allocate stake to
          arguments you believe will hold.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Active Arguments" value={argumentsFeed.length.toString()} />
        <StatCard label="Avg Confidence" value={averageConfidence.toFixed(2)} />
        <StatCard label="Wallet Connected" value={isConnected ? "Yes" : "No"} />
      </section>

      <section className="ui-card p-5">
        <ArgumentStaker
          items={argumentsFeed}
          isConnected={isConnected}
          onStake={
            isConnected
              ? async ({ argumentId, amount }) => {
                  console.log("Stake", argumentId, amount);
                }
              : undefined
          }
        />
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
