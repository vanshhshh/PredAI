// File: frontend/components/Oracle/SubmissionForm.tsx

/**
 * PURPOSE
 * -------
 * Oracle submission interface.
 *
 * This component:
 * - allows oracle operators to submit outcomes
 * - enforces minimal client-side validation
 * - delegates signing / submission to parent logic
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No business logic
 * - No blockchain calls
 * - Deterministic and auditable inputs
 * - Defensive UX (pending, error)
 */

"use client";

import React, { useState } from "react";

import { LoadingSpinner } from "../Shared/LoadingSpinner";

interface SubmissionFormProps {
  marketId: string;
  onSubmit: (payload: {
    outcome: "YES" | "NO";
    confidence: number;
    evidenceUri?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
  error?: Error | null;
}

export function SubmissionForm({
  marketId,
  onSubmit,
  isSubmitting = false,
  error,
}: SubmissionFormProps) {
  const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
  const [confidence, setConfidence] = useState<number>(0.5);
  const [evidenceUri, setEvidenceUri] = useState<string>("");

  // ------------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (confidence < 0 || confidence > 1) return;

    await onSubmit({
      outcome,
      confidence,
      evidenceUri: evidenceUri || undefined,
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
        Submit Oracle Outcome
      </h3>

      {/* Outcome */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOutcome("YES")}
          className={`flex-1 px-3 py-2 border rounded-md text-sm ${
            outcome === "YES"
              ? "bg-black text-white"
              : "bg-white"
          }`}
        >
          YES
        </button>
        <button
          type="button"
          onClick={() => setOutcome("NO")}
          className={`flex-1 px-3 py-2 border rounded-md text-sm ${
            outcome === "NO"
              ? "bg-black text-white"
              : "bg-white"
          }`}
        >
          NO
        </button>
      </div>

      {/* Confidence */}
      <div>
        <label className="block text-xs font-medium">
          Confidence (0–1)
        </label>
        <input
          type="number"
          min={0}
          max={1}
          step="0.01"
          value={confidence}
          onChange={(e) =>
            setConfidence(Number(e.target.value))
          }
          className="mt-1 w-full border rounded-md p-2 text-sm"
        />
      </div>

      {/* Evidence */}
      <div>
        <label className="block text-xs font-medium">
          Evidence URI (optional)
        </label>
        <input
          type="text"
          value={evidenceUri}
          onChange={(e) =>
            setEvidenceUri(e.target.value)
          }
          className="mt-1 w-full border rounded-md p-2 text-sm"
          placeholder="ipfs://… or https://…"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-red-600">
          {error.message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 bg-black text-white rounded-md text-sm"
      >
        {isSubmitting ? "Submitting…" : "Submit"}
      </button>

      {isSubmitting && (
        <LoadingSpinner label="Submitting oracle data…" />
      )}
    </form>
  );
}
