// File: frontend/components/Agent/CustomizationForm.tsx

/**
 * PURPOSE
 * -------
 * Agent configuration editor.
 *
 * This component:
 * - allows owners to customize agent strategy parameters
 * - validates inputs client-side
 * - submits updates to backend / governance-controlled endpoints
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - Owner-gated usage (parent enforces auth)
 * - Explicit, auditable parameter changes
 * - Defensive UX (pending, error, disabled)
 */

"use client";

import React, { useState } from "react";

import { LoadingSpinner } from "../Shared/LoadingSpinner";

interface AgentConfig {
  riskTolerance: number; // 0..1
  maxExposure: number;
  rebalanceIntervalSec: number;
}

interface CustomizationFormProps {
  agentId: string;
  initialConfig: AgentConfig;
  onSubmit: (config: AgentConfig) => Promise<void>;
  isSubmitting?: boolean;
  error?: Error | null;
}

export function CustomizationForm({
  agentId,
  initialConfig,
  onSubmit,
  isSubmitting = false,
  error,
}: CustomizationFormProps) {
  const [riskTolerance, setRiskTolerance] = useState<number>(
    initialConfig.riskTolerance
  );
  const [maxExposure, setMaxExposure] = useState<number>(
    initialConfig.maxExposure
  );
  const [rebalanceIntervalSec, setRebalanceIntervalSec] =
    useState<number>(initialConfig.rebalanceIntervalSec);

  // ------------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side sanity checks
    if (
      riskTolerance < 0 ||
      riskTolerance > 1 ||
      maxExposure <= 0 ||
      rebalanceIntervalSec <= 0
    ) {
      return;
    }

    await onSubmit({
      riskTolerance,
      maxExposure,
      rebalanceIntervalSec,
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
      <h3 className="font-semibold text-sm">Agent Configuration</h3>

      {/* Risk Tolerance */}
      <div>
        <label className="block text-xs font-medium">
          Risk Tolerance (0–1)
        </label>
        <input
          type="number"
          step="0.01"
          min={0}
          max={1}
          value={riskTolerance}
          onChange={(e) =>
            setRiskTolerance(Number(e.target.value))
          }
          className="mt-1 w-full border rounded-md p-2 text-sm"
        />
      </div>

      {/* Max Exposure */}
      <div>
        <label className="block text-xs font-medium">
          Max Exposure
        </label>
        <input
          type="number"
          min={0}
          value={maxExposure}
          onChange={(e) =>
            setMaxExposure(Number(e.target.value))
          }
          className="mt-1 w-full border rounded-md p-2 text-sm"
        />
      </div>

      {/* Rebalance Interval */}
      <div>
        <label className="block text-xs font-medium">
          Rebalance Interval (seconds)
        </label>
        <input
          type="number"
          min={1}
          value={rebalanceIntervalSec}
          onChange={(e) =>
            setRebalanceIntervalSec(
              Number(e.target.value)
            )
          }
          className="mt-1 w-full border rounded-md p-2 text-sm"
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
        className="px-4 py-2 bg-black text-white rounded-md text-sm"
      >
        {isSubmitting ? "Saving…" : "Save Changes"}
      </button>

      {isSubmitting && (
        <LoadingSpinner label="Updating agent…" />
      )}
    </form>
  );
}
