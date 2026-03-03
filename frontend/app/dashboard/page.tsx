"use client";

import React from "react";
import Link from "next/link";

import { AgentDashboard } from "@/components/Agent/AgentDashboard";
import { MarketCard } from "@/components/Market/MarketCard";
import { ErrorBoundary } from "@/components/Shared/ErrorBoundary";
import { LoadingSpinner } from "@/components/Shared/LoadingSpinner";
import { PortfolioOptimizer } from "@/components/Yield/PortfolioOptimizer";
import { useAgents } from "@/hooks/useAgents";
import { useMarkets } from "@/hooks/useMarkets";
import { useYield } from "@/hooks/useYield";

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}

function DashboardContent() {
  const {
    markets,
    isLoading: marketsLoading,
    error: marketsError,
    refetch: refetchMarkets,
  } = useMarkets();

  const { agents, isLoading: agentsLoading, error: agentsError } = useAgents();

  const { portfolio, isLoading: yieldLoading, error: yieldError } = useYield();

  if (marketsLoading || agentsLoading || yieldLoading) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Loading dashboard..." />
      </section>
    );
  }

  if (marketsError) {
    return (
      <section className="page-container py-14">
        <ErrorState title="Markets unavailable" message={marketsError.message} onRetry={refetchMarkets} />
      </section>
    );
  }

  if (agentsError) {
    return (
      <section className="page-container py-14">
        <ErrorState title="Agents unavailable" message={agentsError.message} />
      </section>
    );
  }

  if (yieldError) {
    return (
      <section className="page-container py-14">
        <ErrorState title="Yield data unavailable" message={yieldError.message} />
      </section>
    );
  }

  const totalMarkets = markets?.length ?? 0;
  const totalAgents = agents?.length ?? 0;
  const portfolioRisk = portfolio?.risk ?? 0;
  const portfolioValue = portfolio?.totalValue ?? 0;

  return (
    <main className="page-container space-y-8 py-8">
      <header className="ui-card fade-in-up p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="ui-kicker">Command Center</p>
            <h1 className="mt-1 text-3xl font-semibold text-white">Portfolio Overview</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Track active markets, agent performance, and yield optimizer output
              from one unified control surface.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/markets/create" className="ui-btn ui-btn-secondary">
              Create Market
            </Link>
            <Link href="/agents/create" className="ui-btn ui-btn-secondary">
              Launch Agent
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Markets" value={totalMarkets.toString()} />
        <StatCard label="Your Agents" value={totalAgents.toString()} />
        <StatCard label="Portfolio Risk" value={portfolioRisk.toFixed(2)} />
        <StatCard label="Portfolio Value" value={`$${portfolioValue.toLocaleString()}`} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Active Markets</h2>
          <Link href="/markets/list" className="ui-btn ui-btn-ghost">
            View all
          </Link>
        </div>
        {markets?.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {markets.map((market) => (
              <MarketCard key={market.marketId} market={market} />
            ))}
          </div>
        ) : (
          <EmptyState title="No markets yet" message="Create your first market to start trading." />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Agent Network</h2>
          <Link href="/agents/my-agents" className="ui-btn ui-btn-ghost">
            Manage agents
          </Link>
        </div>
        {agents?.length ? (
          <AgentDashboard agents={agents} />
        ) : (
          <EmptyState
            title="No agents deployed"
            message="Launch an autonomous agent to automate strategy execution."
          />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Yield Allocation</h2>
          <Link href="/yield/portfolio" className="ui-btn ui-btn-ghost">
            Open portfolio
          </Link>
        </div>
        {portfolio ? (
          <PortfolioOptimizer
            allocations={portfolio.allocations.map((allocation) => ({
              vaultId: allocation.vaultId,
              name: allocation.vaultId,
              currentWeight: allocation.currentWeight,
              recommendedWeight: allocation.recommendedWeight,
              expectedApy: allocation.expectedApy,
            }))}
            portfolioRisk={portfolio.risk}
          />
        ) : (
          <EmptyState
            title="No yield data"
            message="Deposit funds into vaults to activate optimizer recommendations."
          />
        )}
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

function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <article className="ui-card max-w-2xl p-6">
      <h3 className="text-lg font-semibold text-rose-200">{title}</h3>
      <p className="mt-2 text-sm text-rose-100">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="ui-btn ui-btn-secondary mt-4">
          Retry
        </button>
      )}
    </article>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <article className="ui-card p-5">
      <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-300">{message}</p>
    </article>
  );
}
