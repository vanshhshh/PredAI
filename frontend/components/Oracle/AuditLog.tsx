// File: frontend/components/Oracle/AuditLog.tsx

/**
 * PURPOSE
 * -------
 * Verifiable oracle decision audit log.
 *
 * This component:
 * - renders individual oracle submissions
 * - exposes outcome, confidence, weight, and timestamps
 * - provides a transparent, immutable-feeling audit trail
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Read-only
 * - Deterministic rendering
 * - Handles partial / evolving logs
 * - Safe for long histories (virtualizable later)
 */

// File: frontend/components/Oracle/AuditLog.tsx

"use client";

import React from "react";

interface OracleSubmission {
  oracleId: string;
  outcome: "YES" | "NO";
  weight: number;
}

interface AuditLogProps {
  marketId: string;
  submissions: OracleSubmission[];
  resolvedAt?: number;
}

export function AuditLog({
  marketId,
  submissions,
  resolvedAt,
}: AuditLogProps) {
  if (!submissions || submissions.length === 0) {
    return (
      <div className="text-xs text-gray-500 italic">
        No oracle submissions yet.
      </div>
    );
  }

  const totalWeight = submissions.reduce(
    (sum, s) => sum + s.weight,
    0
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold tracking-wide uppercase text-gray-400">
          Oracle Submissions
        </h4>

        <div className="text-[11px] text-gray-500">
          {submissions.length} oracle
          {submissions.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {submissions.map((s, idx) => {
          const weightPercent =
            totalWeight > 0
              ? (s.weight / totalWeight) * 100
              : 0;

          return (
            <div
              key={`${s.oracleId}-${idx}`}
              className="
                rounded-xl
                border border-white/5
                bg-white/[0.02]
                p-4
                space-y-2
              "
            >
              {/* Top Row */}
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  Oracle{" "}
                  <span className="text-gray-400">
                    {s.oracleId.slice(0, 8)}…
                  </span>
                </div>

                <span
                  className={`
                    text-xs px-2 py-1 rounded-full font-semibold
                    ${
                      s.outcome === "YES"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }
                  `}
                >
                  {s.outcome}
                </span>
              </div>

              {/* Weight */}
              <div className="text-[11px] text-gray-400">
                Weight: {s.weight.toFixed(2)} (
                {weightPercent.toFixed(1)}%)
              </div>

              {/* Weight Bar */}
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    s.outcome === "YES"
                      ? "bg-green-400"
                      : "bg-red-400"
                  }`}
                  style={{ width: `${weightPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Resolution Timestamp */}
      {resolvedAt && (
        <div className="text-[11px] text-gray-500 border-t border-white/5 pt-3">
          Resolved at{" "}
          {new Date(resolvedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
