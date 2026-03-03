"use client";

import React, { useState } from "react";

import { MarketCard } from "../../../components/Market/MarketCard";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { useMarkets } from "../../../hooks/useMarkets";

export default function MarketListPage() {
  return (
    <ErrorBoundary>
      <MarketListContent />
    </ErrorBoundary>
  );
}

function MarketListContent() {
  const [query, setQuery] = useState("");
  const { markets, isLoading, error } = useMarkets();

  const filteredMarkets = markets.filter((market) =>
    market.title.toLowerCase().includes(query.toLowerCase())
  );

  if (isLoading) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Loading markets..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-container py-14">
        <div className="ui-card max-w-2xl p-6">
          <h2 className="text-lg font-semibold text-rose-200">Failed to load markets</h2>
          <p className="mt-2 text-sm text-rose-100">{error.message}</p>
        </div>
      </section>
    );
  }

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Market Discovery</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Browse Prediction Markets</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Search live and historical markets, inspect probability spreads, and
          open individual trading detail views.
        </p>
      </header>

      <section className="ui-card p-4">
        <label htmlFor="market-search" className="ui-label">
          Search Markets
        </label>
        <input
          id="market-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by title..."
          className="ui-input"
          aria-label="Search markets"
        />
      </section>

      {!filteredMarkets.length ? (
        <section className="ui-card p-6">
          <h2 className="text-lg font-semibold text-slate-100">No markets found</h2>
          <p className="mt-1 text-sm text-slate-300">Try a broader search term.</p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredMarkets.map((market) => (
            <MarketCard key={market.marketId} market={market} />
          ))}
        </section>
      )}
    </main>
  );
}
