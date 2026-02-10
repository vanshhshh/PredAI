// File: frontend/app/agents/my-agents/page.tsx

/**
 * PURPOSE
 * -------
 * “My Agents” dashboard for the connected user.
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Backend is source of truth
 * - Wallet-gated view
 * - No mock or inferred data
 * - Defensive UX
 */

"use client";

import React from "react";

import { useAgents } from "../../../hooks/useAgents";
import { useWallet } from "../../../hooks/useWallet";

import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";

import { AgentDashboard } from "../../../components/Agent/AgentDashboard";

export default function MyAgentsPage() {
  return (
    <ErrorBoundary>
      <MyAgentsContent />
    </ErrorBoundary>
  );
}

function MyAgentsContent() {
  const { address, isConnected } = useWallet();
  const {
    myAgents,
    isLoading,
    error,
  } = useAgents();

  // ------------------------------------------------------------
  // GUARD
  // ------------------------------------------------------------

  if (!isConnected) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold">
          Connect your wallet
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Connect a wallet to view your agents.
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------

  if (isLoading) {
    return (
      <LoadingSpinner label="Loading your agents…" />
    );
  }

  // ------------------------------------------------------------
  // ERROR
  // ------------------------------------------------------------

  if (error) {
    return (
      <div className="p-6 border rounded-md bg-red-50">
        <h3 className="font-semibold text-red-700">
          Failed to load agents
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

  if (!myAgents || myAgents.length === 0) {
    return (
      <div className="p-6 border rounded-md bg-gray-50">
        <h3 className="font-semibold">
          No agents found
        </h3>
        <p className="text-sm text-gray-600 mt-2">
          You do not own any agents yet.
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // MAIN
  // ------------------------------------------------------------

  return (
    <main className="px-6 py-8 space-y-10 max-w-6xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold">
          My Agents
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Agents owned by {address}
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-4">
          Owned Agents
        </h2>
        <AgentDashboard agents={myAgents} />
      </section>
    </main>
  );
}
