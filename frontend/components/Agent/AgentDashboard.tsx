// File: frontend/components/Agent/AgentDashboard.tsx

/**
 * PURPOSE
 * -------
 * Unified dashboard for displaying AI agent performance.
 *
 * This component:
 * - renders agent-level metrics (PnL, accuracy, activity)
 * - supports single-agent and multi-agent views
 * - optionally exposes marketplace / delegation actions
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Presentational + light derivation only
 * - No data fetching
 * - Deterministic rendering
 * - Scales to large agent lists
 */

"use client";

import React from "react";
import Link from "next/link";

interface Agent {
  agentId: string;
  owner: string;
  active: boolean;
  stake: number;
  accuracy: number; // [0,1]
  pnl: number;
  trades: number;
  nftTokenId?: string;
}

interface AgentDashboardProps {
  agents: Agent[];
  showActions?: boolean;
  walletAddress?: string;
  isConnected?: boolean;
}

export function AgentDashboard({
  agents,
  showActions = false,
  walletAddress,
  isConnected = false,
}: AgentDashboardProps) {
  if (!agents || agents.length === 0) {
    return (
      <div className="p-4 border rounded-md bg-gray-50 text-sm">
        No agents to display.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {agents.map((agent) => {
        const isOwner =
          walletAddress &&
          walletAddress.toLowerCase() ===
            agent.owner.toLowerCase();

        return (
          <div
            key={agent.agentId}
            className="border rounded-md p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            {/* Identity */}
            <div className="space-y-1">
              <Link
                href={`/agents/${agent.agentId}`}
                className="font-medium text-sm hover:underline"
              >
                Agent {agent.agentId.slice(0, 8)}…
              </Link>
              <div className="text-xs text-gray-600">
                Owner: {agent.owner}
              </div>
              <div className="text-xs">
                Status:{" "}
                <span
                  className={
                    agent.active
                      ? "text-green-600"
                      : "text-gray-500"
                  }
                >
                  {agent.active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <Metric
                label="Accuracy"
                value={`${(agent.accuracy * 100).toFixed(1)}%`}
              />
              <Metric
                label="PnL"
                value={agent.pnl.toFixed(2)}
              />
              <Metric
                label="Trades"
                value={agent.trades.toString()}
              />
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex gap-2">
                <Link
                  href={`/agents/${agent.agentId}`}
                  className="px-3 py-1 border rounded-md text-xs"
                >
                  View
                </Link>

                {isConnected && !isOwner && (
                  <button className="px-3 py-1 border rounded-md text-xs">
                    Delegate
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
