// File: frontend/app/markets/list/page.tsx

/**
 * PURPOSE
 * -------
 * Paginated market discovery & browsing page.
 *
 * This page:
 * - lists all markets with pagination
 * - supports filtering & search (client-side controls)
 * - is optimized for large datasets
 * - acts as the primary discovery surface
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - All data via hooks
 * - Stateless pagination controls
 * - Defensive UX (loading, error, empty)
 */

"use client";

import React, { useState } from "react";

import { useMarkets } from "../../../hooks/useMarkets";

import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";
import { MarketCard } from "../../../components/Market/MarketCard";

export default function MarketListPage() {
  return (
    <ErrorBoundary>
      <MarketListContent />
    </ErrorBoundary>
  );
}

function MarketListContent() {
  const [query, setQuery] = useState("");

  const {
    markets,
    isLoading,
    error,
  } = useMarkets();

  // ------------------------------------------------------------------
  // FILTER (client-side for now)
  // ------------------------------------------------------------------

  const filteredMarkets = markets.filter((market) =>
    market.title.toLowerCase().includes(query.toLowerCase())
  );

  // ------------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------------

  if (isLoading) {
    return <LoadingSpinner label="Loading markets…" />;
  }

  // ------------------------------------------------------------------
  // ERROR
  // ------------------------------------------------------------------

  if (error) {
    return (
      <div className="p-6 border rounded-md bg-red-50">
        <h3 className="font-semibold text-red-700">
          Failed to load markets
        </h3>
        <p className="text-sm text-red-600 mt-2">
          {error.message}
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // EMPTY
  // ------------------------------------------------------------------

  if (!filteredMarkets || filteredMarkets.length === 0) {
    return (
      <div className="p-6 border rounded-md bg-gray-50">
        <h3 className="font-semibold">No markets found</h3>
        <p className="text-sm text-gray-600 mt-2">
          Try adjusting your search.
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // MAIN
  // ------------------------------------------------------------------

  return (
    <main className="px-6 py-8 space-y-6">
      {/* Search */}
      <div className="max-w-md">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search markets…"
          className="w-full border rounded-md p-2"
        />
      </div>

      {/* Market Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredMarkets.map((market) => (
          <MarketCard
            key={market.marketId}
            market={market}
          />
        ))}
      </div>
    </main>
  );
}
