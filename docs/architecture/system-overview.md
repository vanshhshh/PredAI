# System Overview
Unified AI–Crypto Prediction Market Platform

## 1. Purpose

This system is a production-grade, AI-native prediction market and financial coordination platform.
It transforms prediction markets from passive, human-driven betting venues into an autonomous, machine-participated financial system where:

- AI agents act as first-class economic participants
- Decentralized AI oracles resolve truth with cryptographic guarantees
- Social discourse becomes executable financial infrastructure
- Idle capital is continuously yield-optimized
- Prediction outcomes feed downstream DeFi and real-world financial products

This platform is designed to safely operate with real money, real users, and autonomous agents.

---

## 2. High-Level Architecture

The system is composed of five tightly-coupled layers, each with explicit responsibilities and failure boundaries.

┌──────────────────────────────────────────┐
│ Frontend (Next.js) │
│ UI, Wallets, AI Copilot, Visualization │
└───────────────▲──────────────────────────┘
│
┌───────────────┴──────────────────────────┐
│ Backend Services (FastAPI) │
│ APIs, Indexing, Risk, Orchestration │
└───────────────▲──────────────────────────┘
│
┌───────────────┴──────────────────────────┐
│ AI Agent System │
│ Prediction, Market-Making, Arbitration │
└───────────────▲──────────────────────────┘
│
┌───────────────┴──────────────────────────┐
│ Decentralized Oracle Network │
│ AI Consensus, Verification, Slashing │
└───────────────▲──────────────────────────┘
│
┌───────────────┴──────────────────────────┐
│ Blockchain Layer │
│ Markets, Settlement, Capital, RWAs │
└──────────────────────────────────────────┘


Each layer may fail independently without collapsing the entire system.

---

## 3. Core Design Principles

### 3.1 AI-First Participation

AI agents are participants, not tools.
They:
- Hold wallets and capital
- Place bets and provide liquidity
- Compete economically
- Are rewarded or slashed based on performance

Human users and AI agents operate under the same market rules.

---

### 3.2 Blockchain as Settlement, Not Computation

The blockchain is responsible for:
- Enforcing economic invariants
- Holding and transferring capital
- Final market settlement
- Slashing and reward execution

All heavy computation (AI inference, NLP, simulations) occurs off-chain, but must be:
- Deterministic in inputs
- Auditable in outputs
- Economically accountable

---

### 3.3 Event-Sourced State Model

- The blockchain is the canonical source of truth
- Backend services index and enrich blockchain events
- Frontend consumes derived state only

No component may assume state without an on-chain or indexed event.

---

## 4. Component Responsibilities

### 4.1 Frontend

- Wallet connection and transaction initiation
- Market, agent, oracle, and yield visualization
- User interaction and confirmations
- AI copilot for advisory insights only

The frontend never:
- Resolves markets
- Computes odds
- Executes trades autonomously

---

### 4.2 Backend Services

Backend services provide:
- Chain indexing and replay
- Deterministic APIs
- Risk calculations
- Social feed ingestion
- Rate limiting and security enforcement

Backend services do not custody funds.

---

### 4.3 AI Agent System

The AI system is responsible for:
- Market prediction
- Autonomous market making
- Cross-market arbitrage
- Social signal interpretation

Each agent has:
- A unique identity
- Versioned models
- Capital at risk
- Performance history

---

### 4.4 Oracle Network

The oracle network:
- Collects independent AI-based assessments
- Reaches consensus via weighted aggregation
- Emits signed resolution events
- Enforces slashing on incorrect or malicious behavior

Oracle outcomes are final unless explicitly disputed via governance.

---

### 4.5 Blockchain Layer

The blockchain layer enforces:
- Market creation and lifecycle
- Capital custody and movement
- Agent and oracle staking
- Settlement finality
- RWA wrapping and cross-chain representation

Smart contracts are minimal, upgrade-aware, and invariant-driven.

---

## 5. Trust Assumptions

- Smart contracts are assumed correct post-audit
- Oracles are economically incentivized to be honest
- AI agents are adversarial by default
- Backend services are untrusted but observable
- Frontend is fully untrusted

---

## 6. Failure Model

The system is designed to tolerate:
- Individual agent failure
- Oracle disagreement
- Backend outages
- Frontend unavailability

The system does not tolerate:
- Undetected invariant violations
- Silent capital loss
- Non-attributable oracle decisions

---

## 7. Upgrade Philosophy

- Smart contracts upgrade via governance-controlled mechanisms
- Backend and AI components are versioned and replaceable
- Frontend changes never alter economic logic

Upgrades prioritize safety over speed.

---

## 8. Non-Goals

This system does not aim to:
- Predict with perfect accuracy
- Eliminate market risk
- Centralize decision-making
- Optimize for short-term speculation

It aims to create a resilient, self-improving financial intelligence layer.
