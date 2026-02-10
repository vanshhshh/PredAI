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

"use client";

import React from "react";

export default function GuidePage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-16">
      <header className="space-y-4">
        <h1 className="text-3xl font-semibold">
          What You Can Do on This Platform
        </h1>
        <p className="text-gray-600 max-w-3xl">
          This platform is an AI-powered, non-custodial prediction and yield
          ecosystem. You control your funds, your agents, and your decisions.
          Everything else is automated, optimized, and transparent.
        </p>
      </header>

      {/* -------------------------------- */}
      {/* ONBOARDING */}
      {/* -------------------------------- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          1. Get Started Instantly (No Signup)
        </h2>
        <p className="text-gray-700">
          There are no accounts, emails, or passwords. Your wallet is your
          identity.
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Connect a wallet like MetaMask or Phantom</li>
          <li>Optionally use fiat on-ramps (UPI, cards, bank transfer)</li>
          <li>Your funds always stay in your wallet</li>
        </ul>
      </section>

      {/* -------------------------------- */}
      {/* MARKETS */}
      {/* -------------------------------- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          2. Bet on Real-World & Crypto Events
        </h2>
        <p className="text-gray-700">
          Prediction markets let you express beliefs with capital.
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Binary and multi-outcome markets</li>
          <li>Live odds powered by AI agents</li>
          <li>Instant settlement via oracles</li>
          <li>Global markets: crypto, politics, sports, culture</li>
        </ul>
      </section>

      {/* -------------------------------- */}
      {/* AI AGENTS */}
      {/* -------------------------------- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          3. Own AI Agents That Trade for You
        </h2>
        <p className="text-gray-700">
          AI agents are autonomous strategies you can own, customize, and earn
          from.
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Create or buy AI agents as NFTs</li>
          <li>Configure risk, data sources, and behavior</li>
          <li>Agents can bet, market-make, or arbitrage</li>
          <li>Earn based on performance and accuracy</li>
        </ul>
      </section>

      {/* -------------------------------- */}
      {/* SOCIAL */}
      {/* -------------------------------- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          4. Create Markets from Conversations
        </h2>
        <p className="text-gray-700">
          Markets don’t start with developers — they start with ideas.
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Turn prompts into live markets</li>
          <li>Spawn markets from social trends</li>
          <li>Stake on arguments, not just outcomes</li>
          <li>Earn when your insight proves correct</li>
        </ul>
      </section>

      {/* -------------------------------- */}
      {/* YIELD */}
      {/* -------------------------------- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          5. Earn Yield Without Active Trading
        </h2>
        <p className="text-gray-700">
          Idle capital can be routed intelligently using AI.
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>AI-optimized yield portfolios</li>
          <li>Risk-aware allocation strategies</li>
          <li>Automated rebalancing</li>
          <li>Cross-market arbitrage by agents</li>
        </ul>
      </section>

      {/* -------------------------------- */}
      {/* ORACLES */}
      {/* -------------------------------- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          6. Oracles & Market Resolution
        </h2>
        <p className="text-gray-700">
          Outcomes are resolved through decentralized oracle consensus.
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>AI + human oracle networks</li>
          <li>Staking and slashing for accuracy</li>
          <li>Transparent resolution logic</li>
          <li>No single point of failure</li>
        </ul>
      </section>

      {/* -------------------------------- */}
      {/* GOVERNANCE */}
      {/* -------------------------------- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          7. Govern the Platform
        </h2>
        <p className="text-gray-700">
          Power users don’t just participate — they decide.
        </p>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Vote on fees, parameters, upgrades</li>
          <li>Submit proposals</li>
          <li>Timelocked, transparent execution</li>
          <li>Global, borderless DAO</li>
        </ul>
      </section>

      {/* -------------------------------- */}
      {/* SAFETY */}
      {/* -------------------------------- */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">
          Safety & Transparency
        </h2>
        <ul className="list-disc pl-6 text-gray-600 space-y-1">
          <li>Non-custodial by design</li>
          <li>Open-source smart contracts</li>
          <li>Risk indicators everywhere</li>
          <li>Emergency pause mechanisms</li>
        </ul>
      </section>

      {/* -------------------------------- */}
      {/* FOOTER */}
      {/* -------------------------------- */}
      <footer className="pt-10 border-t text-sm text-gray-500">
        This platform is designed for global access, fair markets, and
        long-term sustainability. You are always in control.
      </footer>
    </main>
  );
}
