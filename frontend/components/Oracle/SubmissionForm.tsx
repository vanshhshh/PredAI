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

// File: frontend/components/Oracle/SubmissionForm.tsx

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
  const [confidence, setConfidence] = useState<number>(0.75);
  const [evidenceUri, setEvidenceUri] = useState<string>("");

  const confidencePercent = Math.round(confidence * 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (confidence < 0 || confidence > 1) return;

    await onSubmit({
      outcome,
      confidence,
      evidenceUri: evidenceUri || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-white/5 bg-white/[0.02] p-6"
    >
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold tracking-wide">
          Oracle Submission
        </h3>
        <p className="text-xs text-gray-500">
          Submit your weighted outcome with confidence score.
        </p>
      </div>

      {/* Outcome Selector */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-gray-500">
          Outcome
        </label>

        <div className="flex gap-3">
          <OutcomeButton
            active={outcome === "YES"}
            color="green"
            onClick={() => setOutcome("YES")}
          >
            YES
          </OutcomeButton>

          <OutcomeButton
            active={outcome === "NO"}
            color="red"
            onClick={() => setOutcome("NO")}
          >
            NO
          </OutcomeButton>
        </div>
      </div>

      {/* Confidence Slider */}
      <div className="space-y-3">
        <label className="text-xs uppercase tracking-wide text-gray-500">
          Confidence
        </label>

        <div className="text-2xl font-semibold">
          {confidencePercent}%
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={confidence}
          onChange={(e) =>
            setConfidence(Number(e.target.value))
          }
          className="w-full accent-indigo-500"
        />

        <div className="text-[11px] text-gray-500">
          Reflects your probabilistic certainty.
        </div>
      </div>

      {/* Evidence */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-gray-500">
          Evidence URI (Optional)
        </label>

        <input
          type="text"
          value={evidenceUri}
          onChange={(e) => setEvidenceUri(e.target.value)}
          placeholder="ipfs://… or https://…"
          className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />

        <div className="text-[11px] text-gray-500">
          Attach verifiable source for auditability.
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
          {error.message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-indigo-600 hover:bg-indigo-500 transition px-4 py-2 text-sm font-medium"
      >
        {isSubmitting ? "Submitting…" : "Submit Oracle Outcome"}
      </button>

      {isSubmitting && (
        <LoadingSpinner label="Broadcasting oracle submission…" />
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponents                                                       */
/* ------------------------------------------------------------------ */

function OutcomeButton({
  children,
  active,
  color,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  color: "green" | "red";
  onClick: () => void;
}) {
  const activeStyles =
    color === "green"
      ? "bg-green-500/20 border-green-500 text-green-400"
      : "bg-red-500/20 border-red-500 text-red-400";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex-1 rounded-md border px-4 py-2 text-sm font-medium transition
        ${
          active
            ? activeStyles
            : "border-white/10 bg-black/40 text-gray-300 hover:border-white/20"
        }
      `}
    >
      {children}
    </button>
  );
}
