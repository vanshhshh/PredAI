// File: frontend/app/markets/create/page.tsx

/**
 * PURPOSE
 * -------
 * Market creation page (prompt-driven + structured controls).
 *
 * This page:
 * - allows users to create new prediction markets
 * - supports natural-language prompts AND explicit parameters
 * - performs client-side validation only (no business logic)
 * - submits to backend API for compilation + deployment
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - Clear separation: UI validation vs backend enforcement
 * - Defensive UX (errors, pending state, retry)
 * - Extensible for AI-assisted prompt compilation
 */

"use client";

import React, { useState } from "react";

import { useWallet } from "../../../hooks/useWallet";
import { useMarkets } from "../../../hooks/useMarkets";

import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { Modal } from "../../../components/Shared/Modal";

export default function CreateMarketPage() {
  const { address, isConnected } = useWallet();
  const { createMarket, isCreating, error } = useMarkets();

  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxExposure, setMaxExposure] = useState<number>(0);
  const [showConfirm, setShowConfirm] = useState(false);

  // ------------------------------------------------------------
  // GUARD
  // ------------------------------------------------------------

  if (!isConnected || !address) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold">Connect your wallet</h2>
        <p className="text-sm text-gray-600 mt-2">
          You must connect a wallet to create a market.
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

    await createMarket({
      title,
      description,
      endTime: new Date(endTime).getTime(),
      maxExposure,
      metadata: prompt || undefined, // optional, safe
    });
  }

  // ------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------

  return (
    <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Create Market</h1>
        <p className="text-sm text-gray-600 mt-1">
          Create a new prediction market using structured inputs or a prompt.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium">
            Natural-language prompt (optional)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="mt-2 w-full border rounded-md p-2"
            rows={3}
            placeholder="e.g. Will Bitcoin exceed $150k before June 2026?"
          />
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-2 w-full border rounded-md p-2"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="mt-2 w-full border rounded-md p-2"
            rows={4}
          />
        </div>

        {/* End Time */}
        <div>
          <label className="block text-sm font-medium">End Time</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="mt-2 border rounded-md p-2"
          />
        </div>

        {/* Max Exposure */}
        <div>
          <label className="block text-sm font-medium">
            Max Exposure (units)
          </label>
          <input
            type="number"
            value={maxExposure}
            onChange={(e) => setMaxExposure(Number(e.target.value))}
            min={0}
            className="mt-2 border rounded-md p-2"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border rounded-md text-sm text-red-600">
            {error.message}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isCreating}
          className="px-4 py-2 bg-black text-white rounded-md"
        >
          {isCreating ? "Creating…" : "Create Market"}
        </button>
      </form>

      {/* Confirm */}
      {showConfirm && (
        <Modal
          title="Confirm market creation"
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirm}
        >
          <p className="text-sm text-gray-700">
            You are about to create a new market. This action is irreversible
            once deployed.
          </p>
        </Modal>
      )}

      {isCreating && <LoadingSpinner label="Deploying market…" />}
    </main>
  );
}
