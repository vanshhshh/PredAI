"use client";

import React from "react";

import { LoadingSpinner } from "../Shared/LoadingSpinner";
import { RiskGauge } from "./RiskGauge";

interface Allocation {
  vaultId: string;
  name: string;
  currentWeight: number;
  recommendedWeight: number;
  expectedApy: number;
}

interface PortfolioOptimizerProps {
  allocations: Allocation[];
  portfolioRisk: number;
  isOptimizing?: boolean;
  onRebalance?: () => Promise<void>;
  error?: Error | null;
}

export function PortfolioOptimizer({
  allocations,
  portfolioRisk,
  isOptimizing = false,
  onRebalance,
  error,
}: PortfolioOptimizerProps) {
  if (!allocations?.length) {
    return (
      <div className="ui-card-soft rounded-xl p-4 text-sm text-slate-300">
        No allocation data is available for optimization yet.
      </div>
    );
  }

  return (
    <section className="ui-card space-y-5 p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="ui-kicker">Allocation Engine</p>
          <h3 className="text-base font-semibold text-white">Portfolio Optimizer</h3>
          <p className="mt-1 text-xs text-slate-300">
            Current weights versus AI recommended distribution.
          </p>
        </div>
        <RiskGauge risk={portfolioRisk} />
      </header>

      <div className="space-y-3">
        {allocations.map((allocation) => {
          const delta = allocation.recommendedWeight - allocation.currentWeight;
          const deltaPercent = delta * 100;

          return (
            <article
              key={allocation.vaultId}
              className="rounded-xl border border-white/10 bg-slate-950/35 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-100">{allocation.name}</h4>
                <span className="rounded-md border border-emerald-300/25 bg-emerald-400/10 px-2 py-1 text-xs font-semibold text-emerald-100">
                  {allocation.expectedApy.toFixed(2)}% APY
                </span>
              </div>

              <div className="mt-3 space-y-2">
                <ProgressRow
                  label="Current"
                  value={allocation.currentWeight * 100}
                  fillClass="bg-slate-400"
                />
                <ProgressRow
                  label="Recommended"
                  value={allocation.recommendedWeight * 100}
                  fillClass="bg-gradient-to-r from-cyan-300 to-emerald-300"
                />
              </div>

              {Math.abs(delta) > 0.01 && (
                <p className="mt-2 text-xs text-slate-300">
                  Adjustment:
                  <span
                    className={`ml-1 font-semibold ${
                      delta > 0 ? "text-emerald-200" : "text-rose-200"
                    }`}
                  >
                    {delta > 0 ? "+" : ""}
                    {deltaPercent.toFixed(1)}%
                  </span>
                </p>
              )}
            </article>
          );
        })}
      </div>

      {error && <p className="text-sm text-rose-300">{error.message}</p>}

      {onRebalance && (
        <button
          type="button"
          onClick={() => void onRebalance()}
          disabled={isOptimizing}
          className="ui-btn ui-btn-primary w-full"
        >
          {isOptimizing ? "Rebalancing portfolio..." : "Apply AI Rebalance"}
        </button>
      )}

      {isOptimizing && <LoadingSpinner label="Running optimization..." size="sm" />}
    </section>
  );
}

function ProgressRow({
  label,
  value,
  fillClass,
}: {
  label: string;
  value: number;
  fillClass: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>{label}</span>
        <span>{value.toFixed(1)}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-950/45">
        <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
