// File: frontend/app/yield/vaults/page.tsx

/**
 * PURPOSE
 * -------
 * Yield vault discovery & analysis page.
 *
 * This page:
 * - lists all available yield vaults
 * - exposes risk / APY / strategy metadata
 * - allows users to inspect vault mechanics before allocating capital
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - Read-heavy, analytics-focused UI
 * - Clear risk signaling
 * - Defensive UX (loading, error, empty)
 */

"use client";

import React from "react";

import { useYield } from "../../../hooks/useYield";

import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";

import { VaultCard } from "../../../components/Yield/VaultCard";

export default function YieldVaultsPage() {
  return (
    <ErrorBoundary>
      <VaultsContent />
    </ErrorBoundary>
  );
}

function VaultsContent() {
  const { vaults, isLoading, error } = useYield();

  // ------------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------------

  if (isLoading) {
    return <LoadingSpinner label="Loading yield vaults…" />;
  }

  // ------------------------------------------------------------------
  // ERROR
  // ------------------------------------------------------------------

  if (error) {
    return (
      <div className="p-6 border rounded-md bg-red-50">
        <h3 className="font-semibold text-red-700">
          Failed to load vaults
        </h3>
        <p className="text-sm text-red-600 mt-2">{error.message}</p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // EMPTY
  // ------------------------------------------------------------------

  if (!vaults || vaults.length === 0) {
    return (
      <div className="p-6 border rounded-md bg-gray-50">
        <h3 className="font-semibold">No vaults available</h3>
        <p className="text-sm text-gray-600 mt-2">
          No yield vaults are currently active.
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // MAIN
  // ------------------------------------------------------------------

  return (
    <main className="px-6 py-8 space-y-8 max-w-6xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold">Yield Vaults</h1>
        <p className="text-sm text-gray-600 mt-1">
          Explore available yield strategies and their risk profiles.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {vaults.map((vault) => (
          <VaultCard key={vault.vaultId} vault={vault} />
        ))}
      </div>
    </main>
  );
}
