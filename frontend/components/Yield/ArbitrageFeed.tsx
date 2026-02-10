// File: frontend/components/Yield/ArbitrageFeed.tsx

/**
 * PURPOSE
 * -------
 * Live arbitrage opportunity feed.
 *
 * This component:
 * - displays arbitrage routes detected by AI agents
 * - shows spread, confidence, and execution status
 * - is read-only (execution handled elsewhere)
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No side effects
 * - Deterministic rendering
 * - Stream-friendly (frequent updates)
 * - Clear risk & confidence signaling
 */

"use client";

import React from "react";

interface ArbitrageOpportunity {
  
  opportunityId: string;
  route: string;
  spread: number; // %
  confidence: number; // 0..1
  status: "OPEN" | "EXECUTED" | "EXPIRED";
}

interface ArbitrageFeedProps {
  feed: ArbitrageOpportunity[];
}

export function ArbitrageFeed({ feed }: ArbitrageFeedProps) {
  if (!feed || feed.length === 0) {
    return (
      <div className="border rounded-md p-4 text-sm text-gray-600">
        No arbitrage opportunities available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {feed.map((op) => (
        <div
          key={op.opportunityId}
          className="border rounded-md p-3 flex justify-between items-center"
        >
          <div className="space-y-0.5">
            <div className="font-medium text-sm">
              {op.route}
            </div>
            <div className="text-xs text-gray-600">
              Spread:{" "}
              <strong>
                {op.spread.toFixed(2)}%
              </strong>
            </div>
          </div>

          <div className="text-right text-xs space-y-0.5">
            <div>
              Confidence:{" "}
              {(op.confidence * 100).toFixed(0)}%
            </div>
            <div
              className={`font-medium ${
                op.status === "OPEN"
                  ? "text-green-600"
                  : op.status === "EXECUTED"
                  ? "text-blue-600"
                  : "text-gray-500"
              }`}
            >
              {op.status}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
