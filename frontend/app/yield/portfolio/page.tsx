// File: frontend/app/yield/portfolio/page.tsx

/**
 * PURPOSE
 * -------
 * Personalized yield portfolio dashboard.
 *
 * This page:
 * - shows the user’s current yield allocations
 * - visualizes risk / return characteristics
 * - integrates AI-driven optimization suggestions
 * - allows rebalancing via backend + on-chain execution
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - Portfolio is read-only unless wallet is connected
 * - Heavy emphasis on risk visibility
 * - Production-grade defensive UX
 */

// File: frontend/app/yield/portfolio/page.tsx

"use client";

/**
 * PURPOSE
 * -------
 * Personalized yield portfolio dashboard.
 *
 * - Displays current portfolio allocations
 * - Shows risk and optimization suggestions
 * - Allows rebalance via backend
 */

import React from "react";

import { useYield } from "../../../hooks/useYield";
import { useWallet } from "../../../hooks/useWallet";

import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";

import { PortfolioOptimizer } from "../../../components/Yield/PortfolioOptimizer";
import { RiskGauge } from "../../../components/Yield/RiskGauge";

export default function YieldPortfolioPage() {
  return (
    <ErrorBoundary>
      <YieldPortfolioContent />
    </ErrorBoundary>
  );
}

function YieldPortfolioContent() {
  const { address, isConnected } = useWallet();
  const {
    portfolio,
    isLoading,
    error,
    rebalance,
    isRebalancing,
  } = useYield();

  // ------------------------------------------------------------
  // GUARD
  // ------------------------------------------------------------

  if (!isConnected) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold">Connect your wallet</h2>
        <p className="text-sm text-gray-600 mt-2">
          Connect a wallet to view your yield portfolio.
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------

  if (isLoading) {
    return <LoadingSpinner label="Loading yield portfolio…" />;
  }

  // ------------------------------------------------------------
  // ERROR
  // ------------------------------------------------------------

  if (error) {
    return (
      <div className="p-6 border rounded-md bg-red-50">
        <h3 className="font-semibold text-red-700">
          Failed to load portfolio
        </h3>
        <p className="text-sm text-red-600 mt-2">{error.message}</p>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="p-6 border rounded-md bg-gray-50">
        <h3 className="font-semibold">No portfolio data</h3>
        <p className="text-sm text-gray-600 mt-2">
          Portfolio data is not available yet.
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // DOMAIN → UI ADAPTER
  // ------------------------------------------------------------

  // DOMAIN → UI ADAPTER
const allocationsForUI: {
  vaultId: string;
  name: string;
  currentWeight: number;
  recommendedWeight: number;
  expectedApy: number;
}[] = portfolio.allocations.map((alloc) => ({
  vaultId: alloc.vaultId,
  name: alloc.vaultId,
  currentWeight: alloc.currentWeight,
  recommendedWeight: alloc.recommendedWeight,
  expectedApy: alloc.expectedApy,
}));


  // ------------------------------------------------------------
  // MAIN
  // ------------------------------------------------------------

  return (
    <main className="px-6 py-8 space-y-10 max-w-6xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold">Yield Portfolio</h1>
        <p className="text-sm text-gray-600 mt-1">
          Optimized allocations for {address}
        </p>
      </header>

      {/* Risk + Optimizer */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <RiskGauge risk={portfolio.risk} />
        <PortfolioOptimizer
  allocations={allocationsForUI}
  portfolioRisk={portfolio.risk}
/>
      </section>

      {/* Rebalance */}
      <section>
        <button
          onClick={rebalance}
          disabled={isRebalancing}
          className="px-4 py-2 bg-black text-white rounded-md"
        >
          {isRebalancing ? "Rebalancing…" : "Rebalance Portfolio"}
        </button>
      </section>
    </main>
  );
}