// File: frontend/app/agents/marketplace/page.tsx

/**
 * PURPOSE
 * -------
 * Secondary marketplace for AI agent NFTs.
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Backend is source of truth
 * - Read-heavy, browse optimized
 * - Wallet-aware but non-custodial
 * - Defensive UX
 */

"use client";

import React from "react";

import { useAgents } from "../../../hooks/useAgents";
import { useWallet } from "../../../hooks/useWallet";

import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";

import { AgentDashboard } from "../../../components/Agent/AgentDashboard";

export default function AgentMarketplacePage() {
  return (
    <ErrorBoundary>
      <MarketplaceContent />
    </ErrorBoundary>
  );
}

function MarketplaceContent() {
  const { address, isConnected } = useWallet();
  const {
    marketplaceAgents,
    isLoading,
    error,
  } = useAgents();

  // ------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------

  if (isLoading) {
    return (
      <LoadingSpinner label="Loading agent marketplace…" />
    );
  }

  // ------------------------------------------------------------
  // ERROR
  // ------------------------------------------------------------

  if (error) {
    return (
      <div className="p-6 border rounded-md bg-red-50">
        <h3 className="font-semibold text-red-700">
          Failed to load marketplace
        </h3>
        <p className="text-sm text-red-600 mt-2">
          {error.message}
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // EMPTY
  // ------------------------------------------------------------

  if (!marketplaceAgents || marketplaceAgents.length === 0) {
    return (
      <div className="p-6 border rounded-md bg-gray-50">
        <h3 className="font-semibold">
          No agents listed
        </h3>
        <p className="text-sm text-gray-600 mt-2">
          No agents are currently available on the marketplace.
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // MAIN
  // ------------------------------------------------------------

  return (
    <main className="px-6 py-8 space-y-8 max-w-6xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold">
          Agent Marketplace
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Discover, acquire, or delegate high-performing AI agents.
        </p>
      </header>

      <AgentDashboard
        agents={marketplaceAgents}
        showActions
        walletAddress={address}
        isConnected={isConnected}
      />
    </main>
  );
}
