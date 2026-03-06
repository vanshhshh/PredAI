"use client";

export default function GuidePage() {
  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Platform Guide</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">What You Can Do on PredAI</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          PredAI is a non-custodial prediction and yield platform. You control capital in your
          wallet while AI and protocol logic handle strategy and execution workflows.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Tag label="Prediction Markets" />
          <Tag label="AI Agents" />
          <Tag label="Yield Optimization" />
          <Tag label="Governance" />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Access Model" value="Wallet-First" />
        <StatCard label="Custody" value="Non-Custodial" />
        <StatCard label="Execution" value="On-Chain" />
        <StatCard label="Control" value="User-Owned" />
      </section>

      <section className="space-y-4">
        <FeatureBlock
          number="01"
          title="Instant Access (No Accounts)"
          description="Your wallet is your identity. No passwords and no custodial lock-in."
          points={[
            "Connect MetaMask, Phantom, or WalletConnect",
            "Optional fiat on-ramp integrations",
            "Funds remain in your wallet",
          ]}
        />
        <FeatureBlock
          number="02"
          title="Bet on Real-World and Crypto Events"
          description="Express conviction by taking positions in outcome-based markets."
          points={[
            "Binary and multi-outcome market structures",
            "Real-time probabilities and order flow",
            "Oracle-driven settlement lifecycle",
            "Coverage across crypto, macro, and public events",
          ]}
        />
        <FeatureBlock
          number="03"
          title="Own AI Agents That Trade For You"
          description="Deploy autonomous agents to run strategy logic continuously."
          points={[
            "Agent ownership represented on-chain",
            "Risk and exposure controls per strategy",
            "Support for directional and market-making patterns",
            "Performance and activity tracking",
          ]}
        />
        <FeatureBlock
          number="04"
          title="Turn Ideas into Markets"
          description="Convert social or research signals into market proposals."
          points={[
            "Prompt-to-market workflow",
            "Spawn market drafts from validated signals",
            "Structure market metadata and resolution criteria",
            "Publish through protocol governance rules",
          ]}
        />
        <FeatureBlock
          number="05"
          title="Earn Yield on Idle Capital"
          description="Allocate inactive capital through optimizer-guided vault routing."
          points={[
            "Automated allocation and rebalancing",
            "Risk-adjusted strategy suggestions",
            "Vault-level exposure visibility",
            "Portfolio-level performance monitoring",
          ]}
        />
        <FeatureBlock
          number="06"
          title="Decentralized Oracle Resolution"
          description="Market outcomes resolve through oracle and protocol consensus."
          points={[
            "AI-assisted evidence evaluation",
            "Staking and slashing mechanics",
            "Audit-friendly on-chain resolution records",
            "No single operator dependency",
          ]}
        />
        <FeatureBlock
          number="07"
          title="Govern the Protocol"
          description="Participate in protocol parameter changes and upgrades."
          points={[
            "Submit and vote on proposals",
            "Govern fee and risk parameters",
            "Review upgrade payloads",
            "Timelocked execution for transparency",
          ]}
        />
      </section>

      <section className="ui-card p-5">
        <h2 className="text-lg font-semibold text-white">Safety and Transparency</h2>
        <ul className="mt-3 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
          <li className="rounded-lg border border-slate-400/20 bg-slate-900/30 p-3">
            Non-custodial architecture
          </li>
          <li className="rounded-lg border border-slate-400/20 bg-slate-900/30 p-3">
            Open contract interactions
          </li>
          <li className="rounded-lg border border-slate-400/20 bg-slate-900/30 p-3">
            Risk disclosures across trading flows
          </li>
          <li className="rounded-lg border border-slate-400/20 bg-slate-900/30 p-3">
            Protocol safeguards and emergency controls
          </li>
        </ul>
      </section>

      <footer className="ui-card p-5 text-sm text-slate-300">
        PredAI is designed for transparent market infrastructure and user-owned execution.
      </footer>
    </main>
  );
}

function FeatureBlock({
  number,
  title,
  description,
  points,
}: {
  number: string;
  title: string;
  description: string;
  points: string[];
}) {
  return (
    <article className="ui-card p-5">
      <div className="grid gap-6 md:grid-cols-3 md:items-start">
        <div>
          <p className="ui-kicker">Step {number}</p>
          <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
          <p className="mt-2 text-sm text-slate-300">{description}</p>
        </div>
        <ul className="space-y-2 md:col-span-2">
          {points.map((point) => (
            <li
              key={`${number}-${point}`}
              className="rounded-lg border border-slate-400/20 bg-slate-900/30 px-3 py-2 text-sm text-slate-200"
            >
              {point}
            </li>
          ))}
        </ul>
      </div>
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

function Tag({ label }: { label: string }) {
  return <span className="ui-badge border border-sky-300/30 bg-sky-400/10 text-sky-100">{label}</span>;
}
