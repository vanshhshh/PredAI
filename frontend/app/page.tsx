"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { fetchPlatformStats } from "@/lib/api";
import { yieldEnabled } from "@/lib/features";

type PlatformStats = {
  total_markets: number | null;
  total_wallets: number | null;
  total_bets: number | null;
  total_agents: number | null;
};

const JOURNEY_STEPS = [
  {
    label: "Browse",
    title: "Find a market",
    description: "Search live questions and inspect the current probability spread.",
    href: "/markets/list",
  },
  {
    label: "Act",
    title: "Create or trade",
    description: "Launch a market or take a position.",
    href: "/markets/create",
  },
  {
    label: "Automate",
    title: "Manage agents",
    description: "Watch agent ownership, stake, accuracy, and portfolio behavior.",
    href: "/agents/my-agents",
  },
  {
    label: "Review",
    title: "Govern safely",
    description: "Check proposals, parameters, and protocol history before changes ship.",
    href: "/governance/proposals",
  },
];

const FEATURE_CARDS = [
  {
    title: "Markets",
    description: "Browse, create, and inspect markets without heavy trading clutter.",
    href: "/markets/list",
  },
  {
    title: "Agents",
    description: "Move from ownership to performance and staking controls quickly.",
    href: "/agents/my-agents",
  },
  ...(yieldEnabled
    ? [
        {
          title: "Yield",
          description: "View portfolio allocation.",
          href: "/yield/portfolio",
        },
      ]
    : []),
];

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
    <main className="relative overflow-hidden pb-14">
      <section className="page-container pt-8 sm:pt-12">
        <div className="home-hero">
          <div className="fade-in-up flex flex-col justify-center">
            <h1 className="ui-title max-w-3xl">
              Prediction markets without the noise.
            </h1>
            <p className="ui-subtitle mt-5 max-w-2xl">
              Create markets, trade outcomes, manage agents, and review governance.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard" className="ui-btn ui-btn-primary">
                Open Dashboard
              </Link>
              <Link href="/markets/list" className="ui-btn ui-btn-secondary">
                Explore Markets
              </Link>
            </div>

            <div className="mt-7 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Markets Created" value={stats.total_markets} isLoading={isLoading} />
              <Metric label="Wallets Connected" value={stats.total_wallets} isLoading={isLoading} />
              <Metric label="Bets Placed" value={stats.total_bets} isLoading={isLoading} />
              <Metric label="Active Agents" value={stats.total_agents} isLoading={isLoading} />
            </div>
            {statsQuery.error && (
              <p className="mt-3 text-sm text-amber-200">
                Live stats will appear when the backend is available.
              </p>
            )}
          </div>

          <aside className="journey-panel fade-in-up [animation-delay:90ms]" aria-label="Suggested path">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="ui-kicker">Suggested Path</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Start here</h2>
              </div>
            </div>

            <div>
              {JOURNEY_STEPS.map((step, index) => (
                <Link key={step.title} href={step.href} className="journey-row group">
                  <span className="journey-number">{index + 1}</span>
                  <span>
                    <span className="block text-sm font-semibold text-white">{step.title}</span>
                    <span className="mt-1 block text-xs text-slate-300">{step.description}</span>
                  </span>
                  <span className="text-xs font-semibold text-cyan-200 group-hover:text-cyan-100">
                    {step.label}
                  </span>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="page-container mt-9">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="ui-kicker">Main Workspaces</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Pick the next thing you need</h2>
          </div>
          <Link href="/guide" className="ui-btn ui-btn-secondary">
            Read Guide
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURE_CARDS.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      <section className="page-container mt-9">
        <div className="pastel-band p-6 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-8">
          <div>
            <p className="ui-kicker">Start Reviewing</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Markets first, then agents and governance.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Short flows. Clear controls. Real risk.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 sm:mt-0">
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
    typeof value === "number" ? new Intl.NumberFormat("en-US").format(value) : "N/A";

  return (
    <div className="ui-stat">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
      {isLoading ? (
        <div className="mt-2 h-7 w-20 animate-pulse rounded-md bg-slate-700/50" />
      ) : (
        <p className="mt-1 text-2xl font-semibold text-slate-100">{displayValue}</p>
      )}
    </div>
  );
}

function FeatureCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="ui-card block p-5 transition hover:-translate-y-0.5">
      <h3 className="text-base font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm text-slate-300">{description}</p>
      <span className="mt-4 inline-flex text-xs font-semibold text-cyan-200">Open</span>
    </Link>
  );
}
