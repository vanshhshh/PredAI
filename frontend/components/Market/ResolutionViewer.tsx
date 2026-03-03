"use client";

import React from "react";

import { AuditLog } from "../Oracle/AuditLog";
import { ConsensusMeter } from "../Oracle/ConsensusMeter";

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
    <section className="ui-card space-y-5 p-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="ui-kicker">Oracle Layer</p>
          <h3 className="text-base font-semibold text-white">Resolution State</h3>
        </div>
        <StatusBadge phase={oracleStatus.phase} settled={settled} />
      </header>

      <ConsensusMeter
        confidence={oracleStatus.confidence}
        quorumReached={oracleStatus.quorumReached}
      />

      {settled && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            finalOutcome === "YES"
              ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
              : finalOutcome === "NO"
              ? "border-rose-300/40 bg-rose-400/15 text-rose-100"
              : "border-slate-300/25 bg-slate-900/35 text-slate-200"
          }`}
        >
          <p className="ui-kicker !text-current">Final Outcome</p>
          <p className="mt-1 text-lg font-semibold">{finalOutcome ?? "Pending"}</p>
          {oracleStatus.resolvedAt && (
            <p className="mt-1 text-xs opacity-80">
              Resolved at {new Date(oracleStatus.resolvedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
        <AuditLog
          marketId={marketId}
          submissions={oracleStatus.submissions}
          resolvedAt={oracleStatus.resolvedAt}
        />
      </div>
    </section>
  );
}

function StatusBadge({
  phase,
  settled,
}: {
  phase: "COLLECTING" | "FINALIZING" | "RESOLVED";
  settled: boolean;
}) {
  if (settled || phase === "RESOLVED") {
    return (
      <span className="ui-badge border-emerald-300/30 bg-emerald-400/15 text-emerald-100">
        Resolved
      </span>
    );
  }

  if (phase === "FINALIZING") {
    return (
      <span className="ui-badge border-amber-300/30 bg-amber-300/15 text-amber-100">
        Finalizing
      </span>
    );
  }

  return (
    <span className="ui-badge border-cyan-300/30 bg-cyan-400/15 text-cyan-100">
      Collecting
    </span>
  );
}
