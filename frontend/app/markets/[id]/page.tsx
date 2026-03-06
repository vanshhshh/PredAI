"use client";

import React from "react";
import { useParams } from "next/navigation";
import { useMemo } from "react";

import { BetForm } from "../../../components/Market/BetForm";
import { LiquidityChart } from "../../../components/Market/LiquidityChart";
import { ResolutionViewer } from "../../../components/Market/ResolutionViewer";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";
import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { useMarkets } from "../../../hooks/useMarkets";
import { useOracleStatus } from "../../../hooks/useOracleStatus";

export default function MarketPage() {
  return (
    <ErrorBoundary>
      <MarketContent />
    </ErrorBoundary>
  );
}

function MarketContent() {
  const params = useParams();
  const marketIdRaw = params?.id as string | undefined;
  const marketIdCandidates = useMemo(() => {
    const raw = String(marketIdRaw ?? "").trim();
    if (!raw) return [] as string[];

    const decoded = decodeURIComponent(raw);
    const candidates = new Set<string>([decoded]);
    if (decoded.endsWith(".")) {
      candidates.add(decoded.slice(0, -1));
    } else {
      candidates.add(`${decoded}.`);
    }
    return Array.from(candidates).filter((value) => value.length > 0);
  }, [marketIdRaw]);

  const {
    markets,
    isLoading: marketsLoading,
    error: marketsError,
  } = useMarkets();

  const market = useMemo(() => {
    if (marketIdCandidates.length === 0) return undefined;
    return markets.find((item) => marketIdCandidates.includes(item.marketId));
  }, [marketIdCandidates, markets]);

  const oracleMarketId = market?.marketId ?? marketIdCandidates[0] ?? "";

  const {
    status: oracleStatus,
    isLoading: oracleLoading,
    error: oracleError,
    refetch: refetchOracle,
  } = useOracleStatus(oracleMarketId);

  if (!marketIdRaw) {
    return (
      <section className="page-container py-14">
        <ErrorState title="Invalid market" message="Missing market identifier." />
      </section>
    );
  }

  if (marketsLoading) {
    return (
      <section className="page-container py-14">
        <LoadingSpinner label="Loading market..." />
      </section>
    );
  }

  if (marketsError) {
    return (
      <section className="page-container py-14">
        <ErrorState title="Market unavailable" message={marketsError.message} />
      </section>
    );
  }

  if (!market) {
    return (
      <section className="page-container py-14">
        <ErrorState title="Market not found" message="The requested market does not exist." />
      </section>
    );
  }

  const yesPercent = market.yesOdds === null ? null : Math.round(market.yesOdds * 100);
  const noPercent = market.noOdds === null ? null : Math.round(market.noOdds * 100);
  const timeRemaining = getTimeRemaining(market.endTime);

  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Market Detail</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">{market.title}</h1>
        {market.description && (
          <p className="mt-2 max-w-3xl text-sm text-slate-300">{market.description}</p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetaItem label="Liquidity" value={`$${market.liquidity.toLocaleString()}`} />
          <MetaItem label="Time Remaining" value={timeRemaining} />
          <MetaItem label="Status" value={market.settled ? "Settled" : "Active"} />
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <OddsCard label="YES" value={yesPercent} tone="positive" />
            <OddsCard label="NO" value={noPercent} tone="negative" />
          </div>

          <LiquidityChart
            marketId={market.marketId}
            liquidity={{
              current: market.liquidity,
              history: [],
            }}
          />

          <section className="ui-card p-5">
            {oracleStatus ? (
              <ResolutionViewer
                marketId={market.marketId}
                oracleStatus={oracleStatus}
                settled={market.settled}
                finalOutcome={oracleStatus.finalOutcome}
              />
            ) : oracleError ? (
              <div className="space-y-3">
                <p className="text-sm text-rose-200">
                  Oracle unavailable: {oracleError.message}
                </p>
                <button
                  type="button"
                  onClick={() => void refetchOracle()}
                  className="rounded-md border border-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Retry Oracle Status
                </button>
              </div>
            ) : oracleLoading ? (
              <p className="text-sm text-slate-300">Loading oracle status...</p>
            ) : (
              <p className="text-sm text-slate-300">Oracle status is not available yet.</p>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <BetForm
            marketId={market.marketId}
            yesOdds={market.yesOdds}
            noOdds={market.noOdds}
            isSettled={market.settled}
          />
        </aside>
      </section>
    </main>
  );
}

function OddsCard({
  label,
  value,
  tone,
}: {
  label: "YES" | "NO";
  value: number | null;
  tone: "positive" | "negative";
}) {
  return (
    <article
      className={`ui-card p-5 ${
        tone === "positive"
          ? "border-emerald-300/30 bg-emerald-400/15"
          : "border-rose-300/30 bg-rose-400/15"
      }`}
    >
      <p className="ui-kicker !text-current">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value === null ? "N/A" : `${value}%`}</p>
    </article>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </article>
  );
}

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div className="ui-card max-w-2xl p-6">
      <h2 className="text-lg font-semibold text-rose-200">{title}</h2>
      <p className="mt-2 text-sm text-rose-100">{message}</p>
    </div>
  );
}

function getTimeRemaining(endTime?: number): string {
  if (!endTime) return "Unknown";

  const endMs = endTime < 1_000_000_000_000 ? endTime * 1000 : endTime;
  const diff = endMs - Date.now();
  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return "<1h";
}
