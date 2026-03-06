"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
  const [stats, setStats] = useState<PlatformStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadStats() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/stats", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Stats unavailable");
        }
        const payload = (await response.json()) as Partial<Record<keyof PlatformStats, unknown>>;
        if (!active) return;

        setStats({
          total_markets:
            typeof payload.total_markets === "number" ? payload.total_markets : null,
          total_wallets:
            typeof payload.total_wallets === "number" ? payload.total_wallets : null,
          total_bets: typeof payload.total_bets === "number" ? payload.total_bets : null,
          total_agents: typeof payload.total_agents === "number" ? payload.total_agents : null,
        });
      } catch {
        if (!active) return;
        setStats(EMPTY_STATS);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadStats();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="relative overflow-hidden pb-14">
      <section className="page-container pt-14 sm:pt-20">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="fade-in-up space-y-6">
            <p className="ui-kicker">AI-native markets and strategy infra</p>
            <h1 className="ui-title max-w-3xl">
              Build prediction markets that feel like a live trading terminal.
            </h1>
            <p className="ui-subtitle max-w-2xl">
              MoltMarket combines prediction books, autonomous agents, yield
              routing, and governance into one cohesive operating surface.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className="ui-btn ui-btn-primary">
                Enter Dashboard
              </Link>
              <Link href="/markets/list" className="ui-btn ui-btn-secondary">
                Browse Markets
              </Link>
              <Link href="/guide" className="ui-btn ui-btn-ghost">
                Read Guide
              </Link>
            </div>

            <div className="grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Markets Created" value={stats.total_markets} isLoading={isLoading} />
              <Metric label="Wallets Connected" value={stats.total_wallets} isLoading={isLoading} />
              <Metric label="Bets Placed" value={stats.total_bets} isLoading={isLoading} />
              <Metric label="Active Agents" value={stats.total_agents} isLoading={isLoading} />
            </div>
          </div>

          <div className="ui-card fade-in-up p-6 [animation-delay:90ms]">
            <h2 className="text-lg font-semibold text-white">Platform Modules</h2>
            <div className="mt-4 space-y-3">
              {[
                "Market discovery and position management",
                "Autonomous trading agent marketplace",
                "Risk-adjusted yield vault allocator",
                "Social signal ingestion and argument staking",
                "On-chain governance voting workflows",
              ].map((item) => (
                <p
                  key={item}
                  className="rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2 text-sm text-slate-200"
                >
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-container mt-10">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            title="Signal to market in one flow"
            description="Compile prompts and social feeds into structured markets while preserving auditability."
          />
          <FeatureCard
            title="AI agents as first-class actors"
            description="Monitor ownership, stake, performance, and lifecycle controls from one dashboard."
          />
          <FeatureCard
            title="Treasury-aware yield routing"
            description="Balance expected APY and portfolio risk with allocation recommendations and rebalance actions."
          />
        </div>
      </section>

      <section className="page-container mt-10">
        <div className="ui-card p-8 text-center">
          <p className="ui-kicker">Ready to launch</p>
          <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
            Start with markets, scale to autonomous intelligence.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300">
            Every route in the app is structured for real usage: discovery,
            execution, governance, and portfolio control.
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
        <p className="mt-1 text-xl font-semibold text-slate-100">{displayValue}</p>
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
