// File: frontend/app/risk-disclosure/page.tsx

"use client";

export default function RiskDisclosurePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-10">

        {/* Header */}
        <header className="space-y-4">
          <h1 className="text-4xl font-semibold tracking-tight">
            Risk Disclosure
          </h1>
          <p className="text-sm text-neutral-500">
            Please read carefully before participating.
          </p>
          <p className="text-neutral-700 max-w-3xl">
            Participation in prediction markets, AI-driven strategies,
            decentralized finance mechanisms, and governance systems
            involves significant financial and technological risk.
            By using PredAI, you acknowledge and accept these risks.
          </p>
        </header>

        {/* Market Risk */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">
            1. Market Risk
          </h2>
          <ul className="list-disc pl-6 text-neutral-700 space-y-1">
            <li>You may lose part or all of your staked assets.</li>
            <li>Market outcomes may resolve differently than expected.</li>
            <li>Prices and implied probabilities may fluctuate rapidly.</li>
            <li>Liquidity may be insufficient to exit positions.</li>
          </ul>
        </section>

        {/* Smart Contract Risk */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">
            2. Smart Contract & Protocol Risk
          </h2>
          <ul className="list-disc pl-6 text-neutral-700 space-y-1">
            <li>Smart contracts may contain bugs or vulnerabilities.</li>
            <li>Upgrades or governance actions may alter protocol behavior.</li>
            <li>Blockchain networks may experience congestion or failure.</li>
            <li>Bridges and cross-chain systems carry additional risk.</li>
          </ul>
        </section>

        {/* Oracle Risk */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">
            3. Oracle & Resolution Risk
          </h2>
          <ul className="list-disc pl-6 text-neutral-700 space-y-1">
            <li>Oracle systems may experience delays or disputes.</li>
            <li>AI models may misinterpret real-world events.</li>
            <li>Resolution outcomes may be contested.</li>
            <li>Final decisions may rely on decentralized consensus.</li>
          </ul>
        </section>

        {/* AI Agent Risk */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">
            4. AI Agent Risk
          </h2>
          <ul className="list-disc pl-6 text-neutral-700 space-y-1">
            <li>AI agents may execute losing strategies.</li>
            <li>Past performance does not guarantee future results.</li>
            <li>Autonomous strategies may react unpredictably to market shocks.</li>
            <li>Users are responsible for configuring risk parameters.</li>
          </ul>
        </section>

        {/* Yield Risk */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">
            5. Yield & Capital Allocation Risk
          </h2>
          <ul className="list-disc pl-6 text-neutral-700 space-y-1">
            <li>Yield strategies may result in capital loss.</li>
            <li>Rebalancing systems may amplify volatility.</li>
            <li>Vaults and liquidity pools carry counterparty risk.</li>
          </ul>
        </section>

        {/* Regulatory Risk */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">
            6. Regulatory & Legal Risk
          </h2>
          <p className="text-neutral-700">
            Laws and regulations regarding prediction markets,
            digital assets, and decentralized finance vary by jurisdiction
            and may change without notice. You are solely responsible
            for ensuring compliance with local laws.
          </p>
        </section>

        {/* Non-Custodial */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">
            7. Non-Custodial Responsibility
          </h2>
          <p className="text-neutral-700">
            PredAI does not custody your assets. You retain full control
            of your wallet. Loss of private keys, seed phrases, or
            compromised wallets cannot be recovered by the platform.
          </p>
        </section>

        {/* Final Warning */}
        <section className="space-y-3">
          <h2 className="text-2xl font-semibold">
            Final Notice
          </h2>
          <p className="text-neutral-700">
            Only participate if you fully understand the mechanics
            of decentralized markets, blockchain technology, and
            financial risk. If you are uncertain, seek independent
            financial and legal advice before using the platform.
          </p>
        </section>

        <footer className="pt-10 border-t text-sm text-neutral-500">
          By interacting with PredAI, you acknowledge that you have
          read and accepted this Risk Disclosure.
        </footer>

      </div>
    </main>
  );
}
