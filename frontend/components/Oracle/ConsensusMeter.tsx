// File: frontend/components/Oracle/ConsensusMeter.tsx

/**
 * PURPOSE
 * -------
 * Visual indicator of oracle consensus strength.
 *
 * This component:
 * - displays confidence level (0–100%)
 * - shows whether quorum has been reached
 * - is used in market resolution and oracle dashboards
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Purely presentational
 * - Deterministic rendering
 * - Accessible (text + visual)
 * - Safe for rapid updates
 */

// File: frontend/components/Oracle/ConsensusMeter.tsx

"use client";

import React, { useMemo } from "react";

interface ConsensusMeterProps {
  confidence: number; // 0..1
  quorumReached: boolean;
}

export function ConsensusMeter({
  confidence,
  quorumReached,
}: ConsensusMeterProps) {
  const percent = Math.max(
    0,
    Math.min(100, Math.round(confidence * 100))
  );

  const { barColor, textColor, glowColor, label } =
    useMemo(() => {
      if (quorumReached && percent >= 66) {
        return {
          barColor: "bg-green-500",
          textColor: "text-green-400",
          glowColor: "shadow-[0_0_12px_rgba(34,197,94,0.6)]",
          label: "Strong Consensus",
        };
      }

      if (percent >= 50) {
        return {
          barColor: "bg-yellow-400",
          textColor: "text-yellow-400",
          glowColor: "shadow-[0_0_10px_rgba(250,204,21,0.5)]",
          label: "Moderate Consensus",
        };
      }

      return {
        barColor: "bg-red-500",
        textColor: "text-red-400",
        glowColor: "shadow-[0_0_10px_rgba(239,68,68,0.5)]",
        label: "Weak Consensus",
      };
    }, [percent, quorumReached]);

  return (
    <div className="space-y-4 rounded-xl border border-white/5 bg-white/[0.02] p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-gray-500">
            Oracle Confidence
          </div>
          <div className={`text-sm font-medium ${textColor}`}>
            {label}
          </div>
        </div>

        <div
          className={`
            text-xs px-3 py-1 rounded-full border
            ${
              quorumReached
                ? "bg-green-500/10 text-green-400 border-green-500/20"
                : "bg-gray-700/40 text-gray-400 border-white/10"
            }
          `}
        >
          {quorumReached ? "Quorum Reached" : "Awaiting Quorum"}
        </div>
      </div>

      {/* Percentage */}
      <div className="text-3xl font-semibold tracking-tight">
        {percent}%
      </div>

      {/* Bar */}
      <div className="relative w-full h-3 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`
            h-full transition-all duration-700 ease-out
            ${barColor}
            ${glowColor}
          `}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Subtext */}
      <div className="text-[11px] text-gray-500">
        Confidence reflects weighted oracle agreement across submissions.
      </div>
    </div>
  );
}
