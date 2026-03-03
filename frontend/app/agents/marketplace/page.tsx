"use client";

import React, { useMemo, useState } from "react";

import { AgentDashboard } from "../../../components/Agent/AgentDashboard";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { useAgents } from "../../../hooks/useAgents";
import { useWallet } from "../../../hooks/useWallet";

export default function AgentMarketplacePage() {
  return (
    <ErrorBoundary>
      <MarketplaceContent />
    </ErrorBoundary>
  );
}

function MarketplaceContent() {
  const { address, isConnected } = useWallet();
  const { marketplaceAgents, isLoading, error } = useAgents();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"performance" | "newest">("performance");

  const filteredAgents = useMemo(() => {
    let data = [...(marketplaceAgents ?? [])];

    if (search.trim()) {
      data = data.filter((agent) =>
        agent.agentId.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (sort === "performance") {
      data.sort((a: any, b: any) => {
        const aPnl = typeof a.pnl === "number" ? a.pnl : Number.NEGATIVE_INFINITY;
        const bPnl = typeof b.pnl === "number" ? b.pnl : Number.NEGATIVE_INFINITY;
        return bPnl - aPnl;
      });
    } else {
      data.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    return data;
  }, [marketplaceAgents, search, sort]);

  if (isLoading) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Loading agent marketplace..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-container py-14">
        <CenteredState title="Marketplace unavailable" message={error.message} />
      </section>
    );
  }

  if (!marketplaceAgents?.length) {
    return (
      <section className="page-container py-14">
        <CenteredState
          title="No agents listed"
          message="No autonomous agents are available on the marketplace right now."
        />
      </section>
    );
  }

  const topPnl = Math.max(
    ...marketplaceAgents
      .map((agent: any) => (typeof agent.pnl === "number" ? agent.pnl : Number.NEGATIVE_INFINITY))
  );

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Agent Discovery</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Agent Marketplace</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Browse listed autonomous agents and inspect performance before
          delegation or acquisition.
        </p>
      </header>

      <section className="ui-card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <label htmlFor="agent-search" className="ui-label">
              Search by Agent ID
            </label>
            <input
              id="agent-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Type an agent id..."
              className="ui-input"
            />
          </div>
          <div className="md:min-w-[220px]">
            <label htmlFor="agent-sort" className="ui-label">
              Sort
            </label>
            <select
              id="agent-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as "performance" | "newest")}
              className="ui-select"
            >
              <option value="performance">Sort by Performance</option>
              <option value="newest">Sort by Newest</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="Agents Listed" value={marketplaceAgents.length.toString()} />
        <StatCard
          label="Top PnL"
          value={Number.isFinite(topPnl) ? `$${topPnl.toFixed(2)}` : "N/A"}
        />
        <StatCard label="Wallet Connected" value={isConnected ? "Yes" : "No"} />
      </section>

      <section>
        <AgentDashboard
          agents={filteredAgents}
          showActions
          walletAddress={address}
          isConnected={isConnected}
        />
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="ui-stat">
      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
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
