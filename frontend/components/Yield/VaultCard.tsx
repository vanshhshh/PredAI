"use client";

import Link from "next/link";
import React from "react";

import { RiskGauge } from "./RiskGauge";

interface VaultCardProps {
  vault: {
    vaultId: string;
    name: string;
    description?: string;
    apy: number;
    tvl: number;
    risk: number;
  };
}

export function VaultCard({ vault }: VaultCardProps) {
  const highlightedApy = vault.apy >= 15;

  return (
    <Link
      href={`/yield/vaults/${vault.vaultId}`}
      aria-label={`Open vault ${vault.name}`}
      className="ui-card fade-in-up block p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/45"
    >
      <div className="space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">{vault.name}</h3>
            {vault.description && (
              <p className="mt-1 line-clamp-2 text-sm text-slate-300">{vault.description}</p>
            )}
          </div>
          <RiskGauge risk={vault.risk} />
        </header>

        <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
          <div className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">APY</p>
            <p
              className={`mt-1 text-lg font-semibold ${
                highlightedApy ? "text-emerald-200" : "text-slate-100"
              }`}
            >
              {vault.apy.toFixed(2)}%
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">TVL</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{formatTVL(vault.tvl)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function formatTVL(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}
