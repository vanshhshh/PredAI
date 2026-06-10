"use client";

import React from "react";

import { useAgentAutonomy } from "@/hooks/useAgentAutonomy";
import { fromCollateralUnits } from "@/lib/evmTx";


export function AutonomyPanel({
  agentId,
  isOwner,
}: {
  agentId: string;
  isOwner: boolean;
}) {
  const {
    performance,
    predictions,
    isLoading,
    isRunning,
    error,
    runPaperCycle,
    runLiveCycle,
  } = useAgentAutonomy(agentId);

  const latest = predictions.slice(0, 5);

  return (
    <section className="ui-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="ui-kicker">Autonomy</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Agent Runner</h2>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => void runPaperCycle()}
              className="ui-btn ui-btn-secondary"
            >
              Paper Run
            </button>
            <button
              type="button"
              disabled={isRunning}
              onClick={() => void runLiveCycle()}
              className="ui-btn ui-btn-primary"
            >
              Live Run
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Metric label="Predictions" value={String(performance?.total_predictions ?? 0)} />
        <Metric label="Hit Rate" value={`${((performance?.hit_rate ?? 0) * 100).toFixed(1)}%`} />
        <Metric label="Brier" value={(performance?.brier_score ?? 0).toFixed(3)} />
        <Metric label="PnL" value={formatUnits(performance?.estimated_pnl_wei ?? 0)} />
      </div>

      {error && <p className="mt-3 text-sm text-rose-300">{error.message}</p>}
      {isLoading ? (
        <p className="mt-4 text-sm text-slate-300">Loading...</p>
      ) : latest.length ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/45 text-slate-400">
              <tr>
                <th className="px-3 py-2">Market</th>
                <th className="px-3 py-2">Side</th>
                <th className="px-3 py-2">Edge</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {latest.map((prediction) => (
                <tr key={prediction.prediction_id} className="border-t border-white/10 text-slate-200">
                  <td className="px-3 py-2">{prediction.market_id.slice(0, 18)}</td>
                  <td className="px-3 py-2">{prediction.side}</td>
                  <td className="px-3 py-2">{(prediction.edge_bps / 100).toFixed(1)}%</td>
                  <td className="px-3 py-2">{prediction.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-300">No decisions yet.</p>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="ui-stat py-3">
      <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
    </article>
  );
}

function formatUnits(value: number) {
  const amount = fromCollateralUnits(String(Math.abs(value)));
  const sign = value < 0 ? "-" : "";
  return `${sign}${amount.toFixed(2)}`;
}
