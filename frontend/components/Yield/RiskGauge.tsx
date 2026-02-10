// File: frontend/components/Yield/RiskGauge.tsx

/**
 * PURPOSE
 * -------
 * Compact risk indicator for yield strategies and portfolios.
 *
 * This component:
 * - visualizes normalized risk (0..1)
 * - provides intuitive color + label mapping
 * - is used across vaults, portfolios, and agent UIs
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Purely presentational
 * - Deterministic mapping
 * - Accessible (color + text)
 * - Lightweight (no deps)
 */

"use client";

import React from "react";

interface RiskGaugeProps {
  risk: number; // 0..1
}

export function RiskGauge({ risk }: RiskGaugeProps) {
  const clamped = Math.min(1, Math.max(0, risk));
  const percent = Math.round(clamped * 100);

  let label = "Low";
  let color = "bg-green-500";

  if (percent >= 66) {
    label = "High";
    color = "bg-red-500";
  } else if (percent >= 33) {
    label = "Medium";
    color = "bg-yellow-400";
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-12 h-2 bg-gray-200 rounded">
        <div
          className={`h-2 rounded ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-gray-700">{label}</span>
    </div>
  );
}
