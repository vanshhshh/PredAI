"use client";

import React from "react";

import { VaultCard } from "../../../components/Yield/VaultCard";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { useYield } from "../../../hooks/useYield";

export default function YieldVaultsPage() {
  return (
    <ErrorBoundary>
      <VaultsContent />
    </ErrorBoundary>
  );
}

function VaultsContent() {
  const { vaults, isLoading, error } = useYield();

  if (isLoading) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Loading yield vaults..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-container py-14">
        <MessageCard title="Vault data unavailable" message={error.message} tone="error" />
      </section>
    );
  }

  if (!vaults?.length) {
    return (
      <section className="page-container py-14">
        <MessageCard
          title="No active vaults"
          message="Yield strategies are not currently available."
          tone="neutral"
        />
      </section>
    );
  }

  const averageApy =
    vaults.reduce((sum, vault) => sum + (vault.apy ?? 0), 0) / vaults.length;
  const highestApy = Math.max(...vaults.map((vault) => vault.apy ?? 0));

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Yield Explorer</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Vault Directory</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Compare APY, risk profile, and TVL across AI-managed vault strategies
          before allocating capital.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Total Vaults" value={vaults.length.toString()} />
        <SummaryCard label="Average APY" value={`${averageApy.toFixed(2)}%`} />
        <SummaryCard label="Highest APY" value={`${highestApy.toFixed(2)}%`} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vaults.map((vault) => (
          <VaultCard key={vault.vaultId} vault={vault} />
        ))}
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="ui-stat">
      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
    </article>
  );
}

function MessageCard({
  title,
  message,
  tone,
}: {
  title: string;
  message: string;
  tone: "error" | "neutral";
}) {
  return (
    <article className="ui-card max-w-2xl p-6">
      <h2
        className={`text-lg font-semibold ${
          tone === "error" ? "text-rose-200" : "text-slate-100"
        }`}
      >
        {title}
      </h2>
      <p className={`mt-2 text-sm ${tone === "error" ? "text-rose-100" : "text-slate-300"}`}>
        {message}
      </p>
    </article>
  );
}
