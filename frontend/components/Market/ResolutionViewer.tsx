// File: frontend/components/Market/ResolutionViewer.tsx

/**
 * PURPOSE
 * -------
 * Oracle resolution & settlement viewer for a prediction market.
 *
 * This component:
 * - displays current oracle consensus state
 * - shows confidence / quorum / submissions
 * - renders final settlement outcome once resolved
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Purely presentational (no fetching)
 * - Deterministic rendering
 * - Handles partial / evolving oracle state
 * - Safe for real-time updates
 */

"use client";

import React from "react";

import { ConsensusMeter } from "../Oracle/ConsensusMeter";
import { AuditLog } from "../Oracle/AuditLog";

interface ResolutionViewerProps {
  marketId: string;
  settled: boolean;
  finalOutcome?: "YES" | "NO" | null;
  oracleStatus: {
    phase: "COLLECTING" | "FINALIZING" | "RESOLVED";
    confidence: number;
    quorumReached: boolean;
    submissions: Array<{
      oracleId: string;
      outcome: "YES" | "NO";
      weight: number;
    }>;
    resolvedAt?: number;
  };
}

export function ResolutionViewer({
  marketId,
  settled,
  finalOutcome,
  oracleStatus,
}: ResolutionViewerProps) {
  return (
    <div className="border rounded-md p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Oracle Resolution</h3>
        <StatusBadge
          phase={oracleStatus.phase}
          settled={settled}
        />
      </header>

      {/* Consensus */}
      <ConsensusMeter
        confidence={oracleStatus.confidence}
        quorumReached={oracleStatus.quorumReached}
      />

      {/* Outcome */}
      {settled && (
        <div className="p-3 border rounded-md bg-green-50 text-sm">
          <span className="font-medium">Final outcome:</span>{" "}
          <strong>{finalOutcome}</strong>
        </div>
      )}

      {/* Submissions */}
      <AuditLog
        marketId={marketId}
        submissions={oracleStatus.submissions}
        resolvedAt={oracleStatus.resolvedAt}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Local helpers                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({
  phase,
  settled,
}: {
  phase: string;
  settled: boolean;
}) {
  let label = phase;
  let className =
    "px-2 py-1 rounded text-xs border text-gray-600";

  if (settled) {
    label = "RESOLVED";
    className =
      "px-2 py-1 rounded text-xs bg-green-100 text-green-700";
  } else if (phase === "FINALIZING") {
    className =
      "px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700";
  }

  return <span className={className}>{label}</span>;
}
