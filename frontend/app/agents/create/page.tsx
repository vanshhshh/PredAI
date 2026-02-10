// File: frontend/app/agents/create/page.tsx

/**
 * PURPOSE
 * -------
 * AI Agent creation & registration page.
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Backend is source of truth
 * - Wallet-gated actions
 * - Strict hook contracts
 * - Production-safe typing
 */

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { useWallet } from "../../../hooks/useWallet";
import { useAgents } from "../../../hooks/useAgents";

import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { Modal } from "../../../components/Shared/Modal";

export default function CreateAgentPage() {
  const router = useRouter();

  const { isConnected } = useWallet();
  const { createAgent, isMutating, error } = useAgents();

  const [name, setName] = useState("");
  const [riskTolerance, setRiskTolerance] = useState<number>(5);
  const [maxExposure, setMaxExposure] = useState<number>(1000);
  const [showConfirm, setShowConfirm] = useState(false);

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
          You must connect a wallet to create an agent.
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setShowConfirm(false);

    await createAgent({
      name,
      riskTolerance,
      maxExposure,
    });

    router.push("/agents/my-agents");
  }

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  return (
    <main className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">
          Create AI Agent
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Register a new autonomous agent.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Agent Name */}
        <div>
          <label className="block text-sm font-medium">
            Agent Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-2 border rounded-md p-2 w-full"
            placeholder="Momentum Alpha"
          />
        </div>

        {/* Risk */}
        <div>
          <label className="block text-sm font-medium">
            Risk Tolerance (1–10)
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={riskTolerance}
            onChange={(e) =>
              setRiskTolerance(Number(e.target.value))
            }
            className="mt-2 border rounded-md p-2 w-full"
          />
        </div>

        {/* Exposure */}
        <div>
          <label className="block text-sm font-medium">
            Max Exposure
          </label>
          <input
            type="number"
            min={1}
            value={maxExposure}
            onChange={(e) =>
              setMaxExposure(Number(e.target.value))
            }
            className="mt-2 border rounded-md p-2 w-full"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border rounded-md text-sm text-red-600">
            {error.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isMutating}
          className="px-4 py-2 bg-black text-white rounded-md"
        >
          {isMutating ? "Creating…" : "Create Agent"}
        </button>
      </form>

      {showConfirm && (
        <Modal
          title="Confirm agent creation"
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
        >
          <p className="text-sm text-gray-700">
            This will permanently register a new AI agent.
          </p>
        </Modal>
      )}

      {isMutating && (
        <LoadingSpinner label="Registering agent…" />
      )}
    </main>
  );
}
