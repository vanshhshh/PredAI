// File: frontend/app/markets/[id]/page.tsx

/**
 * PURPOSE
 * -------
 * Single market detail page.
 *
 * This page:
 * - renders real-time market state (odds, liquidity, time)
 * - allows authenticated users to place bets
 * - shows oracle consensus & resolution status
 * - visualizes liquidity and agent participation
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - All data via hooks
 * - Defensive UI (loading / error / empty)
 * - No business logic in JSX
 */

"use client";

import React from "react";
import { useParams } from "next/navigation";

import { useMarkets } from "../../../hooks/useMarkets";
import { useOracleStatus } from "../../../hooks/useOracleStatus";

import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";

import { BetForm } from "../../../components/Market/BetForm";
import { ResolutionViewer } from "../../../components/Market/ResolutionViewer";
import { LiquidityChart } from "../../../components/Market/LiquidityChart";

export default function MarketPage() {
  return (
    <ErrorBoundary>
      <MarketContent />
    </ErrorBoundary>
  );
}

function MarketContent() {
  const params = useParams();
  const marketId = params?.id as string | undefined;

  const {
    markets,
    isLoading: marketsLoading,
    error: marketsError,
  } = useMarkets();

  const {
  status: oracleStatus,
  isLoading: oracleLoading,
  error: oracleError,
} = useOracleStatus(marketId!);


  // ------------------------------------------------------------
  // VALIDATION
  // ------------------------------------------------------------

  if (!marketId) {
    return (
      <ErrorState
        title="Invalid market"
        message="Market identifier is missing or invalid."
      />
    );
  }

  // ------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------

  if (marketsLoading || oracleLoading) {
    return <LoadingSpinner label="Loading market…" />;
  }

  // ------------------------------------------------------------
  // ERRORS
  // ------------------------------------------------------------

  if (marketsError) {
    return (
      <ErrorState
        title="Market unavailable"
        message={marketsError.message}
      />
    );
  }

  if (oracleError) {
    return (
      <ErrorState
        title="Oracle status unavailable"
        message={oracleError.message}
      />
    );
  }

  const market = markets.find(
    (m) => m.marketId === marketId
  );

  if (!market) {
    return (
      <ErrorState
        title="Market not found"
        message="This market does not exist or has been removed."
      />
    );
  }

  // ------------------------------------------------------------
  // MAIN VIEW
  // ------------------------------------------------------------

  return (
    <main className="px-6 py-8 space-y-8">
      {/* Header */}
      <section>
        <h1 className="text-2xl font-semibold">
          {market.title}
        </h1>
        {market.description && (
          <p className="text-sm text-gray-600 mt-1">
            {market.description}
          </p>
        )}
      </section>

      {/* Odds & Liquidity */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <LiquidityChart
          marketId={market.marketId}
          liquidity={{
            current: market.liquidity,
            history: [],
          }}
        />

        <BetForm
          marketId={market.marketId}
          yesOdds={market.yesOdds}
          noOdds={market.noOdds}
          isSettled={market.settled}
        />
      </section>

      {/* Oracle Resolution */}
      <section>
        {oracleStatus ? (
  <ResolutionViewer
    marketId={market.marketId}
    oracleStatus={oracleStatus}
    settled={market.settled}
  />
) : (
  <div className="text-sm text-gray-500">
    Oracle consensus not available yet.
  </div>
)}

      </section>
    </main>
  );
}

/* ------------------------------------------------------------ */
/* Local UI helpers                                             */
/* ------------------------------------------------------------ */

function ErrorState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="p-6 border rounded-md bg-red-50">
      <h3 className="font-semibold text-red-700">
        {title}
      </h3>
      <p className="text-sm text-red-600 mt-2">
        {message}
      </p>
    </div>
  );
}
