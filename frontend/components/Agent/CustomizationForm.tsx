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

// File: frontend/components/Agent/CustomizationForm.tsx

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

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

  return (
    <form
      onSubmit={handleSubmit}
      className="
        rounded-2xl
        border border-white/5
        bg-gradient-to-br from-white/[0.04] to-white/[0.02]
        backdrop-blur-xl
        p-6
        space-y-6
        transition-all
      "
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">
          Agent Configuration
        </h3>
        <span className="text-xs text-gray-500">
          ID: {agentId.slice(0, 8)}…
        </span>
      </div>

      {/* ----------------------------- */}
      {/* Risk Tolerance */}
      {/* ----------------------------- */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-gray-400">
          Risk Tolerance
        </label>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={riskTolerance}
          onChange={(e) =>
            setRiskTolerance(Number(e.target.value))
          }
          className="w-full accent-indigo-500"
        />

        <div className="flex justify-between text-xs text-gray-500">
          <span>Conservative</span>
          <span className="font-medium text-gray-300">
            {(riskTolerance * 100).toFixed(0)}%
          </span>
          <span>Aggressive</span>
        </div>
      </div>

      {/* ----------------------------- */}
      {/* Max Exposure */}
      {/* ----------------------------- */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-gray-400">
          Max Exposure
        </label>
        <input
          type="number"
          min={1}
          value={maxExposure}
          onChange={(e) =>
            setMaxExposure(Number(e.target.value))
          }
          className="
            w-full
            rounded-lg
            bg-black/40
            border border-white/10
            px-3 py-2
            text-sm
            focus:outline-none
            focus:ring-2
            focus:ring-indigo-500/40
            transition
          "
        />
        <p className="text-xs text-gray-500">
          Maximum capital allocation for a single strategy.
        </p>
      </div>

      {/* ----------------------------- */}
      {/* Rebalance Interval */}
      {/* ----------------------------- */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-gray-400">
          Rebalance Interval (seconds)
        </label>
        <input
          type="number"
          min={1}
          value={rebalanceIntervalSec}
          onChange={(e) =>
            setRebalanceIntervalSec(Number(e.target.value))
          }
          className="
            w-full
            rounded-lg
            bg-black/40
            border border-white/10
            px-3 py-2
            text-sm
            focus:outline-none
            focus:ring-2
            focus:ring-indigo-500/40
            transition
          "
        />
        <p className="text-xs text-gray-500">
          How frequently the agent recalibrates its positions.
        </p>
      </div>

      {/* ----------------------------- */}
      {/* Error */}
      {/* ----------------------------- */}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {error.message}
        </div>
      )}

      {/* ----------------------------- */}
      {/* Submit */}
      {/* ----------------------------- */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="
            px-5 py-2
            rounded-lg
            text-sm font-medium
            bg-indigo-600
            hover:bg-indigo-500
            disabled:opacity-50
            transition-colors
          "
        >
          {isSubmitting ? "Saving…" : "Save Changes"}
        </button>

        {isSubmitting && (
          <LoadingSpinner label="Updating agent…" />
        )}
      </div>
    </form>
  );
}
