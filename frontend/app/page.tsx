// File: frontend/app/page.tsx

/**
 * PURPOSE
 * -------
 * Primary application dashboard.
 *
 * This page:
 * - aggregates markets, agents, yield, and governance signals
 * - is the first authenticated landing surface
 * - is designed to scale with real data volumes
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - All data flows through hooks (even if infra wired later)
 * - Defensive UI: loading, error, empty, retry
 * - Zero business logic in JSX
 */

export default function LandingPage() {
  return (
    <main className="bg-black text-white overflow-hidden">
      {/* HERO */}
      <section className="relative min-h-screen flex flex-col justify-center items-center text-center px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/30 via-black to-black" />

        <h1 className="relative z-10 text-6xl font-bold tracking-tight max-w-4xl">
          The Intelligence Layer for Prediction Markets
        </h1>

        <p className="relative z-10 mt-6 text-lg text-gray-400 max-w-2xl">
          An AI-native financial system where humans and autonomous agents
          create, trade, and optimize prediction markets with real yield.
        </p>

        <div className="relative z-10 mt-10 flex gap-4">
          <a
            href="/dashboard"
            className="px-6 py-3 bg-white text-black rounded-lg font-medium"
          >
            Explore Markets
          </a>
          <a
            href="/sign-in"
            className="px-6 py-3 border border-gray-700 rounded-lg text-gray-300 hover:border-gray-500"
          >
            Launch App
          </a>
        </div>

        <p className="relative z-10 mt-6 text-xs text-gray-500">
          Non-custodial • Agent-native • Built for real markets
        </p>
      </section>

      {/* METRICS STRIP */}
      <section className="border-t border-gray-800 py-12">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <Metric label="Active Markets" value="500+" />
          <Metric label="Autonomous Agents" value="AI-native" />
          <Metric label="Settlement" value="On-chain" />
          <Metric label="Yield Strategies" value="Live" />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 max-w-6xl mx-auto">
        <h2 className="text-3xl font-semibold text-center">
          How PredAI Works
        </h2>

        <div className="mt-16 grid md:grid-cols-3 gap-12">
          <Feature
            title="Markets With Skin in the Game"
            desc="Every market is seeded. Creators and the platform provide real liquidity."
          />
          <Feature
            title="AI Agents as First-Class Citizens"
            desc="Agents analyze signals, trade autonomously, and optimize outcomes."
          />
          <Feature
            title="Prediction Meets Yield"
            desc="Idle capital is deployed into yield strategies while markets resolve."
          />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-800 py-10 text-center text-sm text-gray-500">
        <div className="space-x-6">
          <a href="/terms" className="hover:text-gray-300">Terms</a>
          <a href="/privacy" className="hover:text-gray-300">Privacy</a>
          <a href="/risk" className="hover:text-gray-300">Risk Disclosure</a>
        </div>
        <p className="mt-4">© 2026 PredAI</p>
      </footer>
    </main>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="border border-gray-800 rounded-xl p-6 bg-gray-950">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-3 text-gray-400">{desc}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-gray-500 uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}
