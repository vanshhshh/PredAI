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

"use client";

import React from "react";

interface ConsensusMeterProps {
  confidence: number; // 0..1
  quorumReached: boolean;
}

export function ConsensusMeter({
  confidence,
  quorumReached,
}: ConsensusMeterProps) {
  const percent = Math.round(confidence * 100);

  let barColor = "bg-gray-300";
  let textColor = "text-gray-700";

  if (quorumReached && percent >= 66) {
    barColor = "bg-green-500";
    textColor = "text-green-700";
  } else if (percent >= 50) {
    barColor = "bg-yellow-400";
    textColor = "text-yellow-700";
  } else {
    barColor = "bg-red-400";
    textColor = "text-red-700";
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className={textColor}>
          Confidence: {percent}%
        </span>
        <span
          className={
            quorumReached
              ? "text-green-700"
              : "text-gray-500"
          }
        >
          {quorumReached ? "Quorum reached" : "Waiting quorum"}
        </span>
      </div>

      <div className="w-full h-2 bg-gray-200 rounded">
        <div
          className={`h-2 rounded ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
