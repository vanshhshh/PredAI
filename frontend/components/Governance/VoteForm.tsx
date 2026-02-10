// File: frontend/components/Governance/VoteForm.tsx

/**
 * PURPOSE
 * -------
 * Voting interface for governance proposals.
 *
 * This component:
 * - allows token holders to cast FOR / AGAINST votes
 * - validates vote weight client-side
 * - delegates signing / execution to parent logic
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No business logic
 * - No blockchain calls
 * - Deterministic, auditable inputs
 * - Defensive UX (pending, error, disabled)
 */

"use client";

import React, { useState } from "react";

import { LoadingSpinner } from "../Shared/LoadingSpinner";

interface VoteFormProps {
  proposalId: string;
  votingPower: number;
  onVote: (payload: {
    support: "FOR" | "AGAINST";
    weight: number;
  }) => Promise<void>;
  isSubmitting?: boolean;
  error?: Error | null;
}

export function VoteForm({
  proposalId,
  votingPower,
  onVote,
  isSubmitting = false,
  error,
}: VoteFormProps) {
  const [support, setSupport] =
    useState<"FOR" | "AGAINST">("FOR");
  const [weight, setWeight] = useState<number>(0);

  // ------------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (weight <= 0 || weight > votingPower) return;

    await onVote({
      support,
      weight,
    });
  }

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------

  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-md p-4 space-y-4"
    >
      <h3 className="font-semibold text-sm">
        Cast Your Vote
      </h3>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSupport("FOR")}
          className={`flex-1 px-3 py-2 border rounded-md text-sm ${
            support === "FOR"
              ? "bg-black text-white"
              : "bg-white"
          }`}
        >
          FOR
        </button>
        <button
          type="button"
          onClick={() => setSupport("AGAINST")}
          className={`flex-1 px-3 py-2 border rounded-md text-sm ${
            support === "AGAINST"
              ? "bg-black text-white"
              : "bg-white"
          }`}
        >
          AGAINST
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium">
          Vote Weight (max {votingPower})
        </label>
        <input
          type="number"
          min={0}
          max={votingPower}
          value={weight}
          onChange={(e) =>
            setWeight(Number(e.target.value))
          }
          className="mt-1 w-full border rounded-md p-2 text-sm"
        />
      </div>

      {error && (
        <div className="text-xs text-red-600">
          {error.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 bg-black text-white rounded-md text-sm"
      >
        {isSubmitting ? "Submitting vote…" : "Submit Vote"}
      </button>

      {isSubmitting && (
        <LoadingSpinner label="Submitting vote…" />
      )}
    </form>
  );
}
