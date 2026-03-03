// File: frontend/app/guide/page.tsx

/**
 * PURPOSE
 * -------
 * User explainer / product guide.
 *
 * This page explains:
 * - what the platform does
 * - what users can do at each level
 * - how AI, markets, agents, yield, and governance connect
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No marketing fluff
 * - Clear mental models
 * - Non-crypto-friendly language
 * - Global-first (India, US, EU)
 * - Read-only informational page
 */

// File: frontend/app/guide/page.tsx

"use client";

import React from "react";

export default function GuidePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-50 to-white">
      <div className="max-w-6xl mx-auto px-6 py-16 space-y-24">

        {/* Hero */}
        <section className="space-y-6 max-w-4xl">
          <h1 className="text-4xl font-bold tracking-tight leading-tight">
            What You Can Do on PredAI
          </h1>

          <p className="text-lg text-neutral-600">
            PredAI is a non-custodial AI-powered prediction and yield ecosystem.
            You control capital. AI optimizes execution. Markets remain transparent.
          </p>

          <div className="flex flex-wrap gap-4 pt-4 text-sm text-neutral-500">
            <span>Prediction Markets</span>
            <span>•</span>
            <span>AI Agents</span>
            <span>•</span>
            <span>Yield Optimization</span>
            <span>•</span>
            <span>Governance</span>
          </div>
        </section>

        {/* Section Blocks */}
        <FeatureBlock
          number="01"
          title="Instant Access (No Accounts)"
          description="Your wallet is your identity. No passwords. No custody."
          points={[
            "Connect MetaMask, Phantom, or WalletConnect",
            "Optional fiat on-ramps (UPI, cards, bank)",
            "Funds always remain in your wallet",
          ]}
        />

        <FeatureBlock
          number="02"
          title="Bet on Real-World & Crypto Events"
          description="Express belief with capital through prediction markets."
          points={[
            "Binary and multi-outcome markets",
            "Live AI-adjusted odds",
            "Fast oracle-based settlement",
            "Global markets: crypto, politics, sports",
          ]}
        />

        <FeatureBlock
          number="03"
          title="Own AI Agents That Trade For You"
          description="Autonomous strategies you can create, own, or acquire."
          points={[
            "Agents are NFTs",
            "Configure risk and exposure",
            "Market-making, arbitrage, directional strategies",
            "Earn based on performance",
          ]}
        />

        <FeatureBlock
          number="04"
          title="Turn Ideas into Markets"
          description="Create markets from prompts and conversations."
          points={[
            "Convert plain text into tradable markets",
            "Spawn markets from trends",
            "Stake on reasoning and theses",
            "Earn from accurate insights",
          ]}
        />

        <FeatureBlock
          number="05"
          title="Earn Yield on Idle Capital"
          description="AI routes unused funds into optimized yield strategies."
          points={[
            "Automated portfolio allocation",
            "Risk-adjusted strategies",
            "Rebalancing logic",
            "Cross-market arbitrage",
          ]}
        />

        <FeatureBlock
          number="06"
          title="Decentralized Oracle Resolution"
          description="Markets resolve via AI and consensus-driven oracle networks."
          points={[
            "AI + human validation",
            "Staking and slashing incentives",
            "Transparent resolution logic",
            "No single point of failure",
          ]}
        />

        <FeatureBlock
          number="07"
          title="Govern the Protocol"
          description="Participate in shaping platform evolution."
          points={[
            "Submit and vote on proposals",
            "Modify parameters and fees",
            "Protocol upgrades",
            "Timelocked execution",
          ]}
        />

        {/* Safety */}
        <section className="border rounded-2xl p-10 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4">
            Safety & Transparency
          </h2>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-neutral-600 text-sm">
            <li>Non-custodial design</li>
            <li>Open smart contracts</li>
            <li>Risk indicators throughout</li>
            <li>Emergency pause safeguards</li>
          </ul>
        </section>

        {/* Footer */}
        <footer className="pt-10 border-t text-sm text-neutral-500">
          PredAI is built for global participation, transparent markets, and
          long-term sustainability.
        </footer>
      </div>
    </main>
  );
}

/* -------------------------------------------------- */
/* Reusable Feature Block Component                  */
/* -------------------------------------------------- */

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
    <section className="grid md:grid-cols-3 gap-12 items-start">

      {/* Left Column */}
      <div className="space-y-3">
        <div className="text-sm text-neutral-400 tracking-widest">
          {number}
        </div>

        <h2 className="text-2xl font-semibold">
          {title}
        </h2>

        <p className="text-neutral-600 text-sm leading-relaxed">
          {description}
        </p>
      </div>

      {/* Right Column */}
      <div className="md:col-span-2">
        <ul className="space-y-4 text-neutral-700">
          {points.map((point, i) => (
            <li
              key={i}
              className="flex items-start gap-3"
            >
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-black"></span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
