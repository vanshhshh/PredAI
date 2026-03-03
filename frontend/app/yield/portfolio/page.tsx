"use client";

import React from "react";

import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { PortfolioOptimizer } from "../../../components/Yield/PortfolioOptimizer";
import { RiskGauge } from "../../../components/Yield/RiskGauge";
import { useWallet } from "../../../hooks/useWallet";
import { useYield } from "../../../hooks/useYield";
import { formatIdentity } from "../../../lib/identity";

export default function YieldPortfolioPage() {
  return (
    <ErrorBoundary>
      <YieldPortfolioContent />
    </ErrorBoundary>
  );
}

function YieldPortfolioContent() {
  const { address, username, isConnected } = useWallet();
  const { portfolio, isLoading, error, rebalance, isRebalancing } = useYield();

  if (!isConnected) {
    return (
      <section className="page-container py-14">
        <MessageCard
          title="Connect your wallet"
          message="Wallet connection is required to view and rebalance your portfolio."
          tone="neutral"
        />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Loading yield portfolio..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-container py-14">
        <MessageCard title="Portfolio unavailable" message={error.message} tone="error" />
      </section>
    );
  }

  if (!portfolio) {
    return (
      <section className="page-container py-14">
        <MessageCard
          title="No portfolio data"
          message="Yield optimization has not been initialized yet."
          tone="neutral"
        />
      </section>
    );
  }

  const allocationsForUI = portfolio.allocations.map((allocation) => ({
    vaultId: allocation.vaultId,
    name: allocation.vaultId,
    currentWeight: allocation.currentWeight,
    recommendedWeight: allocation.recommendedWeight,
    expectedApy: allocation.expectedApy,
  }));
  const identityLabel = formatIdentity(address, username);

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Yield Portfolio</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Allocator Dashboard</h1>
        <p className="mt-2 text-sm text-slate-300">
          Connected account: {identityLabel}
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[0.42fr_0.58fr]">
        <article className="ui-card space-y-4 p-5">
          <h2 className="text-lg font-semibold text-white">Risk Profile</h2>
          <RiskGauge risk={portfolio.risk} />
          <p className="text-xs text-slate-400">
            Risk score combines volatility, concentration, and strategy
            correlation across active vaults.
          </p>
        </article>

        <PortfolioOptimizer allocations={allocationsForUI} portfolioRisk={portfolio.risk} />
      </section>

      <section className="ui-card flex flex-col items-start justify-between gap-4 p-5 md:flex-row md:items-center">
        <div>
          <p className="ui-kicker">Execution</p>
          <h2 className="mt-1 text-lg font-semibold text-white">AI Suggested Rebalance</h2>
          <p className="mt-1 text-sm text-slate-300">
            Rebalance applies optimizer recommendations on-chain for the current
            allocation state.
          </p>
        </div>
        <button
          type="button"
          onClick={rebalance}
          disabled={isRebalancing}
          className="ui-btn ui-btn-primary"
        >
          {isRebalancing ? "Rebalancing..." : "Rebalance Portfolio"}
        </button>
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
