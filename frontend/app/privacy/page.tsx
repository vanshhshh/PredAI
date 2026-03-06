"use client";

const LAST_UPDATED = "March 6, 2026";

const sections = [
  {
    title: "1. Information We Collect",
    points: [
      "Public wallet addresses connected to the platform",
      "Public usernames linked to connected wallets",
      "Anonymous usage analytics (page views and feature usage)",
      "On-chain transaction metadata that is already public",
    ],
  },
  {
    title: "2. Information We Do Not Collect",
    points: [
      "Private keys or seed phrases",
      "Wallet passwords",
      "Custodial control of user funds",
      "Biometric data",
      "KYC data unless required by future regulatory obligations",
    ],
  },
  {
    title: "3. How We Use Information",
    points: [
      "Operate prediction markets and agent workflows",
      "Improve reliability, performance, and product quality",
      "Provide notifications and system updates",
      "Detect abuse, fraud, and malicious behavior",
    ],
  },
  {
    title: "4. Third-Party Services",
    body: "PredAI uses infrastructure providers for RPC access, telemetry, notifications, and on-ramp integrations. Those services process limited technical metadata under their own policies.",
  },
  {
    title: "5. Data Retention",
    body: "Blockchain records are permanent by design. Off-chain telemetry is retained only for security, operations, and service improvement.",
  },
  {
    title: "6. Security",
    body: "We use access controls, encryption, and monitoring across infrastructure. Wallet and key security remains your direct responsibility.",
  },
  {
    title: "7. Your Rights",
    body: "Depending on your jurisdiction, you may have rights related to data access and deletion for off-chain data linked to your wallet address.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="page-container space-y-6 py-8">
      <header className="ui-card p-6">
        <p className="ui-kicker">Legal</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Privacy Policy</h1>
        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-400">
          Last updated: {LAST_UPDATED}
        </p>
        <p className="mt-3 max-w-3xl text-sm text-slate-300">
          PredAI is non-custodial. You retain control of wallets and assets at all times. This policy
          explains what limited information is processed and why.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Custody" value="User-Controlled" />
        <StatCard label="Private Keys" value="Never Collected" />
        <StatCard label="Wallet Data" value="Public Only" />
        <StatCard label="Telemetry" value="Minimal" />
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
                    className="rounded-lg border border-slate-400/20 bg-slate-900/30 px-3 py-2 text-sm text-slate-200"
                  >
                    {point}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>

      <footer className="ui-card p-5 text-sm text-slate-300">
        PredAI is a non-custodial interface. Trading decisions and wallet security are your
        responsibility.
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
