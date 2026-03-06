"use client";

import type { ReactNode } from "react";

const EFFECTIVE_DATE = "March 6, 2026";

export default function TermsPage() {
  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Legal</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Terms of Service</h1>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">
          Effective date: {EFFECTIVE_DATE}
        </p>
        <p className="mt-3 max-w-3xl text-sm text-slate-300">
          PredAI is a non-custodial platform for prediction markets, AI agents, and capital allocation.
          Using the platform means you accept these terms and the associated risks.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Service Type" value="Non-Custodial" />
        <StatCard label="Advice" value="Not Financial" />
        <StatCard label="User Role" value="Self-Directed" />
        <StatCard label="Liability" value="Limited" />
      </section>

      <section className="space-y-4">
        <LegalSection title="1. No Financial Advice">
          <p>
            Nothing in PredAI constitutes financial, legal, tax, or investment advice. Signals,
            analytics, and AI outputs are informational only.
          </p>
          <p>You are solely responsible for your own decisions and risk assessment.</p>
        </LegalSection>

        <LegalSection title="2. User Responsibility">
          <p>You are responsible for all actions taken with your wallet, including:</p>
          <ul className="mt-1 space-y-2">
            <li className="rounded-lg border border-slate-400/20 bg-slate-900/30 px-3 py-2">
              Creating or interacting with markets
            </li>
            <li className="rounded-lg border border-slate-400/20 bg-slate-900/30 px-3 py-2">
              Staking and managing digital assets
            </li>
            <li className="rounded-lg border border-slate-400/20 bg-slate-900/30 px-3 py-2">
              Running AI agent strategies
            </li>
            <li className="rounded-lg border border-slate-400/20 bg-slate-900/30 px-3 py-2">
              Complying with applicable laws
            </li>
          </ul>
          <p>Losses can result from market volatility, oracle outcomes, code defects, or liquidity constraints.</p>
        </LegalSection>

        <LegalSection title="3. Platform Rights">
          <p>
            PredAI may review, reject, suspend, or remove markets, agents, and related content to
            protect platform integrity, prevent abuse, and address legal obligations.
          </p>
        </LegalSection>

        <LegalSection title="4. Non-Custodial Nature">
          <p>
            PredAI does not custody user assets. You interact with smart contracts through your own
            wallet and must secure your private keys and signing environment.
          </p>
        </LegalSection>

        <LegalSection title="5. Experimental Software">
          <p>
            The service is provided as-is and may include downtime, defects, data delays, and
            unexpected behavior.
          </p>
        </LegalSection>

        <LegalSection title="6. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, PredAI and contributors are not liable for direct
            or indirect losses arising from platform usage.
          </p>
        </LegalSection>
      </section>

      <footer className="ui-card p-5 text-sm text-slate-300">
        Continuing to use PredAI confirms your acceptance of these Terms of Service.
      </footer>
    </main>
  );
}

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="ui-card p-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
    </article>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="ui-stat">
      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-100">{value}</p>
    </article>
  );
}
