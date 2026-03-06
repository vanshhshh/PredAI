"use client";

import Link from "next/link";
import React from "react";

import { shortenAddress } from "@/lib/identity";
import { useResolvedUsernames } from "@/hooks/useResolvedUsernames";

interface Agent {
  agentId: string;
  owner: string;
  active: boolean;
  stake: number;
  accuracy: number;
  pnl: number | null;
  trades: number | null;
  nftTokenId?: string;
}

interface AgentDashboardProps {
  agents: Agent[];
  showActions?: boolean;
}

export function AgentDashboard({
  agents,
  showActions = false,
}: AgentDashboardProps) {
  const usernames = useResolvedUsernames(agents.map((agent) => agent.owner));

  if (!agents?.length) {
    return (
      <div className="ui-card-soft rounded-xl p-4 text-sm text-slate-300">
        No agents available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {agents.map((agent) => {
        const ownerDisplay =
          usernames[agent.owner.toLowerCase()] ?? shortenAddress(agent.owner);

        const accuracyPercent = (agent.accuracy * 100).toFixed(1);
        const pnlColor =
          agent.pnl === null ? "" : agent.pnl >= 0 ? "text-emerald-200" : "text-rose-200";

        return (
          <article
            key={agent.agentId}
            className="ui-card rounded-xl p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/35"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <Link
                  href={`/agents/${agent.agentId}`}
                  className="text-lg font-semibold text-white hover:text-cyan-200"
                >
                  Agent {agent.agentId.slice(0, 8)}...
                </Link>
                <p className="text-xs text-slate-400">Owner: {ownerDisplay}</p>
                <StatusBadge active={agent.active} />
              </div>

              <div className="grid grid-cols-3 gap-3 lg:min-w-[320px]">
                <Metric label="Accuracy" value={`${accuracyPercent}%`} />
                <Metric label="PnL" value={agent.pnl === null ? "N/A" : agent.pnl.toFixed(2)} valueClass={pnlColor} />
                <Metric label="Trades" value={agent.trades === null ? "N/A" : agent.trades.toString()} />
              </div>

              {showActions && (
                <div className="flex gap-2">
                  <Link href={`/agents/${agent.agentId}`} className="ui-btn ui-btn-secondary">
                    View
                  </Link>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Metric({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 text-center">
      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className={`mt-1 text-base font-semibold text-slate-100 ${valueClass}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`ui-badge ${
        active
          ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
          : "border-slate-300/30 bg-slate-400/15 text-slate-200"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
