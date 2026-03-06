"use client";

import React, { useMemo } from "react";

import { AgentDashboard } from "../../../components/Agent/AgentDashboard";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { useAgents } from "../../../hooks/useAgents";
import { useWallet } from "../../../hooks/useWallet";
import { formatIdentity } from "../../../lib/identity";

export default function MyAgentsPage() {
  return (
    <ErrorBoundary>
      <MyAgentsContent />
    </ErrorBoundary>
  );
}

function MyAgentsContent() {
  const { address, username, isConnected } = useWallet();
  const { myAgents, isLoading, error } = useAgents();
  const safeAgents = useMemo(() => myAgents ?? [], [myAgents]);

  const totalStake = useMemo(
    () => safeAgents.reduce((sum, agent: any) => sum + (agent.stake || 0), 0),
    [safeAgents]
  );

  const totalPnL = useMemo(
    () =>
      safeAgents.reduce(
        (sum, agent: any) => sum + (typeof agent.pnl === "number" ? agent.pnl : 0),
        0
      ),
    [safeAgents]
  );

  const hasPnLData = useMemo(
    () => safeAgents.some((agent: any) => typeof agent.pnl === "number"),
    [safeAgents]
  );

  const activeAgents = useMemo(
    () => safeAgents.filter((agent: any) => agent.active).length,
    [safeAgents]
  );

  if (!isConnected) {
    return (
      <section className="page-container py-14">
        <CenteredState
          title="Connect your wallet"
          message="Wallet connection is required to load your agent portfolio."
        />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Loading your agents..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-container py-14">
        <CenteredState title="Failed to load agents" message={error.message} />
      </section>
    );
  }

  if (!myAgents?.length) {
    return (
      <section className="page-container py-14">
        <CenteredState
          title="No agents yet"
          message="You have not created or acquired any autonomous agents."
        />
      </section>
    );
  }

  const identityLabel = formatIdentity(address, username);

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Agent Portfolio</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">My AI Agents</h1>
        <p className="mt-2 text-sm text-slate-300">
          Connected account: {identityLabel}
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="Agents Owned" value={myAgents.length.toString()} />
        <StatCard label="Active Agents" value={activeAgents.toString()} />
        <StatCard
          label="Total Stake"
          value={`${totalStake.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
          })} POL`}
        />
        <StatCard
          label="Total PnL"
          value={hasPnLData ? `$${totalPnL.toLocaleString()}` : "N/A"}
          positive={totalPnL >= 0}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Portfolio Breakdown</h2>
        <AgentDashboard agents={myAgents} />
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <article className="ui-stat">
      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          positive === undefined
            ? "text-slate-100"
            : positive
            ? "text-emerald-200"
            : "text-rose-200"
        }`}
      >
        {value}
      </p>
    </article>
  );
}

function CenteredState({ title, message }: { title: string; message: string }) {
  return (
    <div className="ui-card mx-auto max-w-md p-8 text-center">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-300">{message}</p>
    </div>
  );
}
