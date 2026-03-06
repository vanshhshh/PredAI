"use client";

const sections = [
  {
    title: "1. Market Risk",
    points: [
      "You may lose part or all staked capital.",
      "Market outcomes can resolve differently than expected.",
      "Implied probabilities may move rapidly with low warning.",
      "Liquidity may be insufficient to exit at desired prices.",
    ],
  },
  {
    title: "2. Smart Contract and Protocol Risk",
    points: [
      "Contracts may contain vulnerabilities or implementation defects.",
      "Governance upgrades can change protocol behavior.",
      "Network congestion may delay or fail transactions.",
      "Cross-chain and bridge workflows introduce additional risk.",
    ],
  },
  {
    title: "3. Oracle and Resolution Risk",
    points: [
      "Oracle systems can face delay, dispute, or downtime.",
      "AI interpretation of events can be incorrect.",
      "Resolution outcomes may be contested.",
      "Final settlement may rely on decentralized consensus paths.",
    ],
  },
  {
    title: "4. AI Agent Risk",
    points: [
      "Autonomous strategies can incur losses.",
      "Past performance is not predictive of future returns.",
      "Strategies may behave unpredictably in high-volatility periods.",
      "You are responsible for selecting risk parameters.",
    ],
  },
  {
    title: "5. Yield and Allocation Risk",
    points: [
      "Yield routes may result in loss of principal.",
      "Rebalancing decisions can amplify drawdowns.",
      "Vault and pool integrations add counterparty and execution risk.",
    ],
  },
  {
    title: "6. Regulatory and Legal Risk",
    body: "Prediction market and digital asset regulations vary by jurisdiction and may change without notice. You are responsible for local legal compliance.",
  },
  {
    title: "7. Non-Custodial Responsibility",
    body: "PredAI does not control your wallet. Loss of keys, compromised devices, and signing mistakes cannot be reversed by the platform.",
  },
];

export default function RiskPage() {
  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Risk Disclosure</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Understand the Risks Before Participating</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Prediction markets, AI-driven execution, and DeFi primitives involve material financial,
          technical, and legal risk. Review this disclosure fully before trading or deploying agents.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Capital Risk" value="High" />
        <StatCard label="Custody Model" value="Self-Custody" />
        <StatCard label="Oracle Dependency" value="Required" />
        <StatCard label="Legal Scope" value="Jurisdictional" />
      </section>

      <section className="space-y-4">
        {sections.map((section) => (
          <article key={section.title} className="ui-card p-5">
            <h2 className="text-lg font-semibold text-white">{section.title}</h2>
            {section.body ? <p className="mt-2 text-sm text-slate-300">{section.body}</p> : null}
            {section.points?.length ? (
              <ul className="mt-3 space-y-2">
                {section.points.map((point) => (
                  <li
                    key={`${section.title}-${point}`}
                    className="rounded-lg border border-rose-300/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-100"
                  >
                    {point}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>

      <aside className="ui-card border-amber-300/40 bg-amber-400/10 p-5">
        <h2 className="text-lg font-semibold text-amber-100">Final Notice</h2>
        <p className="mt-2 text-sm text-amber-100/90">
          Participate only if you understand decentralized market mechanics and can tolerate full
          downside on funds allocated to these activities.
        </p>
      </aside>

      <footer className="ui-card p-5 text-sm text-slate-300">
        By interacting with PredAI, you acknowledge and accept this risk disclosure.
      </footer>
    </main>
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
