"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { fetchPlatformStats } from "@/lib/api";

type PlatformStats = {
  total_markets: number | null;
  total_wallets: number | null;
  total_bets: number | null;
  total_agents: number | null;
};

const EMPTY_STATS: PlatformStats = {
  total_markets: null,
  total_wallets: null,
  total_bets: null,
  total_agents: null,
};

export default function LandingPage() {
  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: fetchPlatformStats,
  });

  const payload = statsQuery.data;
  const stats: PlatformStats = {
    total_markets: typeof payload?.total_markets === "number" ? payload.total_markets : null,
    total_wallets: typeof payload?.total_wallets === "number" ? payload.total_wallets : null,
    total_bets: typeof payload?.total_bets === "number" ? payload.total_bets : null,
    total_agents: typeof payload?.total_agents === "number" ? payload.total_agents : null,
  };
  const isLoading = statsQuery.isLoading;

  return (
    <main className="relative overflow-hidden pb-16">
      <section className="page-container pt-12 sm:pt-16">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="fade-in-up space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Live protocol intelligence
            </div>
            <h1 className="ui-title max-w-3xl text-4xl sm:text-5xl">
              The operating system for AI-driven prediction and yield markets.
            </h1>
            <p className="ui-subtitle max-w-2xl text-base">
              MoltMarket unifies discovery, execution, automation, and governance so your capital,
              agents, and strategy decisions stay in one decision loop.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className="ui-btn ui-btn-primary">
                Enter Trading Terminal
              </Link>
              <Link href="/markets/list" className="ui-btn ui-btn-secondary">
                Explore Markets
              </Link>
              <Link href="/guide" className="ui-btn ui-btn-ghost">
                Platform Guide
              </Link>
            </div>

            <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Markets Created" value={stats.total_markets} isLoading={isLoading} />
              <Metric label="Wallets Connected" value={stats.total_wallets} isLoading={isLoading} />
              <Metric label="Bets Placed" value={stats.total_bets} isLoading={isLoading} />
              <Metric label="Active Agents" value={stats.total_agents} isLoading={isLoading} />
            </div>
            {statsQuery.error && (
              <p className="text-sm text-amber-200">
                Backend wake-up in progress. Live stats will appear once Render finishes its cold start.
              </p>
            )}
          </div>

          <aside className="ui-card fade-in-up p-6 [animation-delay:90ms]">
            <p className="ui-kicker">Execution surfaces</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Control every layer from one console</h2>
            <div className="mt-4 space-y-3">
              {[
                ["Prediction Markets", "Live books, deep links, and position workflows"],
                ["Autonomous Agents", "Own, configure, and monitor strategy agents"],
                ["Yield Routing", "Risk-aware allocation with rebalance controls"],
                ["Social Intelligence", "Convert trend signals into launch-ready markets"],
                ["Governance", "Vote, edit parameters, and track protocol evolution"],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-3"
                >
                  <p className="text-sm font-semibold text-slate-100">{title}</p>
                  <p className="mt-1 text-xs text-slate-300">{description}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="page-container mt-10">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            title="Signal to market in one flow"
            description="Compile prompts and social feeds into structured market templates with auditable rationale."
          />
          <FeatureCard
            title="AI agents as first-class actors"
            description="Track ownership, stake, and real-time behavior with lifecycle controls in one view."
          />
          <FeatureCard
            title="Treasury-aware yield routing"
            description="Balance expected APY against concentration and volatility through guided allocations."
          />
        </div>
      </section>

      <section className="page-container mt-10">
        <div className="ui-card p-8 text-center">
          <p className="ui-kicker">Ready to deploy</p>
          <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
            Start trading now, then scale into autonomous execution.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300">
            The frontend is built for daily usage across discovery, execution, governance, and
            portfolio control without context switching.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/sign-in" className="ui-btn ui-btn-primary">
              Sign In
            </Link>
            <Link href="/governance/proposals" className="ui-btn ui-btn-secondary">
              View Governance
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: number | null;
  isLoading: boolean;
}) {
  const displayValue =
    typeof value === "number" ? new Intl.NumberFormat("en-US").format(value) : "—";

  return (
    <div className="ui-stat">
      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      {isLoading ? (
        <div className="mt-1 h-7 w-20 animate-pulse rounded-md bg-slate-700/50" />
      ) : (
        <p className="mt-1 text-2xl font-semibold text-slate-100">{displayValue}</p>
      )}
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <article className="ui-card p-5">
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
    </article>
  );
}
