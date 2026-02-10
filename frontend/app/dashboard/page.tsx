// File: frontend/app/dashboard/page.tsx

/**
 * PURPOSE
 * -------
 * Primary application dashboard.
 *
 * This page:
 * - aggregates markets, agents, yield, and governance signals
 * - is the first authenticated landing surface
 * - is designed to scale with real data volumes
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - All data flows through hooks (even if infra wired later)
 * - Defensive UI: loading, error, empty, retry
 * - Zero business logic in JSX
 */

"use client";

import React from "react";

import { useMarkets } from "@/hooks/useMarkets";
import { useAgents } from "@/hooks/useAgents";
import { useYield } from "@/hooks/useYield";

import { LoadingSpinner } from "@/components/Shared/LoadingSpinner";
import { ErrorBoundary } from "@/components/Shared/ErrorBoundary";

import { MarketCard } from "@/components/Market/MarketCard";
import { AgentDashboard } from "@/components/Agent/AgentDashboard";
import { PortfolioOptimizer } from "@/components/Yield/PortfolioOptimizer";


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

  const {
    agents,
    isLoading: agentsLoading,
    error: agentsError,
  } = useAgents();

  const {
    portfolio,
    isLoading: yieldLoading,
    error: yieldError,
  } = useYield();

  // ------------------------------------------------------------------
  // GLOBAL LOADING
  // ------------------------------------------------------------------

  if (marketsLoading || agentsLoading || yieldLoading) {
    return <LoadingSpinner label="Loading dashboard…" />;
  }

  // ------------------------------------------------------------------
  // ERROR STATES
  // ------------------------------------------------------------------

  if (marketsError) {
    return (
      <ErrorState
        title="Markets unavailable"
        message={marketsError.message}
        onRetry={refetchMarkets}
      />
    );
  }

  if (agentsError) {
    return (
      <ErrorState
        title="Agents unavailable"
        message={agentsError.message}
      />
    );
  }

  if (yieldError) {
    return (
      <ErrorState
        title="Yield data unavailable"
        message={yieldError.message}
      />
    );
  }

  // ------------------------------------------------------------------
  // EMPTY STATES
  // ------------------------------------------------------------------

  if (!markets || markets.length === 0) {
    return (
      <EmptyState
        title="No markets yet"
        message="Markets will appear here as soon as they are created."
      />
    );
  }

  // ------------------------------------------------------------------
  // MAIN DASHBOARD
  // ------------------------------------------------------------------

  return (
    <main className="space-y-10 px-6 py-8">
      {/* Markets */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Active Markets</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {markets.map((market) => (
            <MarketCard key={market.marketId} market={market} />
          ))}
        </div>
      </section>

      {/* Agents */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Your Agents</h2>
        <AgentDashboard agents={agents} />
      </section>

      {/* Yield */}
      {/* Yield */}
<section>
  <h2 className="text-xl font-semibold mb-4">Yield Portfolio</h2>

  {portfolio ? (
    <PortfolioOptimizer
      allocations={portfolio.allocations.map((alloc) => ({
        vaultId: alloc.vaultId,
        name: alloc.vaultId, // placeholder until backend provides name
        currentWeight: alloc.currentWeight,
        recommendedWeight: alloc.recommendedWeight,
        expectedApy: alloc.expectedApy,
      }))}
      portfolioRisk={portfolio.risk}
    />
  ) : (
    <p className="text-sm text-gray-500">
      No portfolio data available.
    </p>
  )}
</section>

    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Local UI helpers (pure presentational)                              */
/* ------------------------------------------------------------------ */

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
    <div className="p-6 border rounded-md bg-red-50">
      <h3 className="font-semibold text-red-700">{title}</h3>
      <p className="text-sm text-red-600 mt-2">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 text-sm underline text-red-700"
        >
          Retry
        </button>
      )}
    </div>
  );
}

function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="p-6 border rounded-md bg-gray-50">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-gray-600 mt-2">{message}</p>
    </div>
  );
}
