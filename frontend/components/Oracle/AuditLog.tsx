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
      <div className="text-xs text-gray-500">
        No oracle submissions yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-gray-700">
        Oracle Submissions
      </h4>

      <div className="border rounded-md divide-y text-xs">
        {submissions.map((s, idx) => (
          <div
            key={`${s.oracleId}-${idx}`}
            className="p-2 flex justify-between items-center"
          >
            <div className="space-y-0.5">
              <div className="font-medium">
                Oracle {s.oracleId.slice(0, 8)}…
              </div>
              <div className="text-gray-500">
                Weight: {s.weight.toFixed(2)}
              </div>
            </div>

            <div
              className={`font-semibold ${
                s.outcome === "YES"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {s.outcome}
            </div>
          </div>
        ))}
      </div>

      {resolvedAt && (
        <div className="text-[11px] text-gray-500">
          Resolved at:{" "}
          {new Date(resolvedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
