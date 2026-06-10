"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";

import { ErrorBoundary } from "../../../../components/Shared/ErrorBoundary";
import { LoadingSpinner } from "../../../../components/Shared/LoadingSpinner";
import { RiskGauge } from "../../../../components/Yield/RiskGauge";
import { useYield } from "../../../../hooks/useYield";
import { yieldEnabled } from "../../../../lib/features";

export default function YieldVaultDetailPage() {
  return (
    <ErrorBoundary>
      <VaultDetailContent />
    </ErrorBoundary>
  );
}

function VaultDetailContent() {
  const params = useParams();
  const vaultId = params?.id as string | undefined;
  const { vaults, isLoading, error } = useYield();

  if (!yieldEnabled) {
    return (
      <section className="page-container py-14">
        <MessageCard
          title="Yield unavailable"
          message="On-chain yield routing must be enabled before this workspace opens."
          tone="neutral"
        />
      </section>
    );
  }

  if (!vaultId) {
    return (
      <section className="page-container py-14">
        <MessageCard title="Invalid vault" message="Vault identifier is missing." tone="error" />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Loading vault..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-container py-14">
        <MessageCard title="Vault unavailable" message={error.message} tone="error" />
      </section>
    );
  }

  const vault = vaults.find((item) => item.vaultId === vaultId);
  if (!vault) {
    return (
      <section className="page-container py-14">
        <MessageCard title="Vault not found" message="The requested vault does not exist." tone="error" />
      </section>
    );
  }

  return (
    <main className="page-container section-stack py-8">
      <header className="ui-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="ui-kicker">Vault Detail</p>
            <h1 className="mt-1 text-3xl font-semibold text-white">{vault.name}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              {vault.description || "Strategy metadata is available at the vault level."}
            </p>
          </div>
          <RiskGauge risk={vault.risk} />
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <StatCard label="APY" value={`${vault.apy.toFixed(2)}%`} />
        <StatCard label="TVL" value={formatCurrency(vault.tvl)} />
        <StatCard label="Risk Score" value={vault.risk.toFixed(2)} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.65fr_0.35fr]">
        <article className="ui-card p-5">
          <h2 className="text-lg font-semibold text-white">Strategy Notes</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p>
              Review expected return, current risk, and total value before taking action.
            </p>
            <p>
              APY and TVL are informational and can change.
            </p>
          </div>
        </article>

        <aside className="ui-card p-5">
          <p className="ui-kicker">Next Steps</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Review before allocating</h2>
          <div className="mt-4 grid gap-2 text-sm text-slate-300">
            <p className="rounded-xl border border-white/10 bg-slate-950/20 px-3 py-3">
              Compare this vault against the broader directory.
            </p>
            <p className="rounded-xl border border-white/10 bg-slate-950/20 px-3 py-3">
              Check portfolio risk before applying any rebalance.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/yield/vaults" className="ui-btn ui-btn-secondary">
              Back to Vaults
            </Link>
            <Link href="/yield/portfolio" className="ui-btn ui-btn-primary">
              Open Portfolio
            </Link>
          </div>
        </aside>
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
      <h2 className={`text-lg font-semibold ${tone === "error" ? "text-rose-200" : "text-slate-100"}`}>
        {title}
      </h2>
      <p className={`mt-2 text-sm ${tone === "error" ? "text-rose-100" : "text-slate-300"}`}>
        {message}
      </p>
    </article>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}
