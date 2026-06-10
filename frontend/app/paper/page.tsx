"use client";

import React from "react";

import { ErrorBoundary } from "@/components/Shared/ErrorBoundary";
import { LoadingSpinner } from "@/components/Shared/LoadingSpinner";
import { usePaperTrading } from "@/hooks/usePaperTrading";


export default function PaperTradingPage() {
  return (
    <ErrorBoundary>
      <PaperTradingContent />
    </ErrorBoundary>
  );
}


function PaperTradingContent() {
  const {
    markets,
    predictions,
    performance,
    isLoading,
    isMutating,
    error,
    ingest,
    run,
  } = usePaperTrading();

  const latest = predictions.slice(0, 12);
  const activeMarkets = markets.filter((market) => market.active).length;

  return (
    <main className="page-container section-stack py-8">
      <header className="ui-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-white">Paper Trading</h1>
            <p className="mt-2 text-sm text-slate-300">Polymarket coverage, virtual positions, live scoring.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isMutating}
              onClick={() => void ingest()}
              className="ui-btn ui-btn-secondary"
            >
              Sync
            </button>
            <button
              type="button"
              disabled={isMutating}
              onClick={() => void run()}
              className="ui-btn ui-btn-primary"
            >
              Run AI
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-5">
        <Stat label="Markets" value={markets.length.toString()} />
        <Stat label="Active" value={activeMarkets.toString()} />
        <Stat label="Open" value={String(performance?.open_predictions ?? 0)} />
        <Stat label="Hit Rate" value={`${((performance?.hit_rate ?? 0) * 100).toFixed(1)}%`} />
        <Stat label="PnL" value={money((performance?.pnl_cents ?? 0) / 100)} />
      </section>

      {error && (
        <section className="ui-card p-4 text-sm text-rose-200">{error.message}</section>
      )}

      {isLoading ? (
        <LoadingSpinner label="Loading paper book..." />
      ) : (
        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="ui-card overflow-hidden">
            <TableHeader title="AI Positions" />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/45 text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Market</th>
                    <th className="px-3 py-2">Side</th>
                    <th className="px-3 py-2">Edge</th>
                    <th className="px-3 py-2">P/L</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {latest.map((prediction) => (
                    <tr key={prediction.prediction_id} className="border-t border-white/10 text-slate-200">
                      <td className="max-w-[320px] px-3 py-2">
                        <p className="line-clamp-2">{prediction.question}</p>
                        <p className="mt-1 text-[10px] uppercase text-slate-500">{prediction.category}</p>
                      </td>
                      <td className="px-3 py-2">{prediction.side}</td>
                      <td className="px-3 py-2">{percent(prediction.edge)}</td>
                      <td className={`px-3 py-2 ${prediction.pnl >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                        {money(prediction.pnl)}
                      </td>
                      <td className="px-3 py-2">{prediction.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ui-card overflow-hidden">
            <TableHeader title="Synced Markets" />
            <div className="max-h-[560px] overflow-y-auto">
              {markets.slice(0, 20).map((market) => (
                <article key={market.external_id} className="border-t border-white/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-sm font-medium text-slate-100">{market.question}</p>
                    <span className="ui-badge text-[10px]">{market.category}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-300">
                    <span>YES {percent(market.yes_price)}</span>
                    <span>NO {percent(market.no_price)}</span>
                    <span>{money(market.volume_24h)} 24h</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}


function TableHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-white/10 px-4 py-3">
      <h2 className="text-base font-semibold text-white">{title}</h2>
    </div>
  );
}


function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="ui-stat py-3">
      <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-100">{value}</p>
    </article>
  );
}


function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}


function money(value: number) {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
