"use client";

import Link from "next/link";
import React from "react";

interface MarketCardProps {
  market: {
    marketId: string;
    title: string;
    description?: string;
    yesOdds: number | null;
    noOdds: number | null;
    liquidity: number;
    endTime: number;
    settled: boolean;
  };
}

export function MarketCard({ market }: MarketCardProps) {
  const isExpired = Date.now() > market.endTime;
  const status: "ACTIVE" | "EXPIRED" | "SETTLED" = market.settled
    ? "SETTLED"
    : isExpired
    ? "EXPIRED"
    : "ACTIVE";

  const yesPercent = toPercent(market.yesOdds);
  const noPercent = toPercent(market.noOdds);

  return (
    <Link
      href={`/markets/${market.marketId}`}
      aria-label={`Open market ${market.title}`}
      className="ui-card fade-in-up block p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/45"
    >
      <div className="space-y-4">
        <header className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-base font-semibold text-white">
            {market.title}
          </h3>
          <StatusBadge status={status} />
        </header>

        {market.description && (
          <p className="line-clamp-2 text-sm text-slate-300">{market.description}</p>
        )}

        <div className="space-y-3">
          <ProbabilityRow label="YES" odds={market.yesOdds} percent={yesPercent} color="bg-emerald-400" />
          <ProbabilityRow label="NO" odds={market.noOdds} percent={noPercent} color="bg-rose-400" />
        </div>

        <footer className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs text-slate-300">
          <div className="rounded-lg bg-slate-950/35 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
              Liquidity
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              ${market.liquidity.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-slate-950/35 px-2.5 py-2">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">
              End Date
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              {new Date(market.endTime).toLocaleDateString()}
            </p>
          </div>
        </footer>
      </div>
    </Link>
  );
}

function ProbabilityRow({
  label,
  odds,
  percent,
  color,
}: {
  label: string;
  odds: number | null;
  percent: number;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span className="font-medium">{label}</span>
        <span>{odds === null ? "N/A" : `${percent.toFixed(1)}%`}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-950/45">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function toPercent(odds: number | null): number {
  if (odds === null) return 50;
  return Math.max(0, Math.min(100, odds * 100));
}

function StatusBadge({ status }: { status: "ACTIVE" | "EXPIRED" | "SETTLED" }) {
  const styles =
    status === "ACTIVE"
      ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-200"
      : status === "SETTLED"
      ? "border-cyan-300/30 bg-cyan-400/15 text-cyan-200"
      : "border-slate-300/20 bg-slate-400/15 text-slate-300";

  return <span className={`ui-badge ${styles}`}>{status}</span>;
}
