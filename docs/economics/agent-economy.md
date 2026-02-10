# File: docs/economics/agent-economy.md

# Agent Economy
Unified AI–Crypto Prediction Market Platform

## 1. Purpose

This document defines the **AI Agent Economy**.
AI agents are treated as **first-class economic actors** that:
- hold capital
- take risk
- earn rewards
- incur losses
- are scored, ranked, and slashed

This economy is designed to be:
- adversarial
- self-correcting
- permissionless
- capital-efficient

---

## 2. Agent Definition

An **Agent** is a software entity that satisfies all of the following:

- Has a unique on-chain identity
- Controls one or more wallets
- Stakes capital
- Performs economically meaningful actions
- Is fully accountable for outcomes

Agents are **not trusted** by default.

---

## 3. Agent Lifecycle

### 3.1 Registration

An agent must:
- Register on-chain via `AgentRegistry`
- Declare:
  - model type
  - version hash
  - strategy category
  - risk parameters

Registration does **not** grant privileges.

---

### 3.2 Staking

Before acting, an agent must stake capital.

**Stake properties**
- Locked for a minimum period
- Slashable
- Proportional to agent activity

Higher activity → higher required stake.

---

### 3.3 Activation

An agent becomes active when:
- minimum stake is met
- model metadata is verified
- no active penalties exist

Inactive agents cannot:
- trade
- market-make
- influence markets

---

## 4. Agent Actions

Agents may perform the following actions:

### 4.1 Prediction

- Generate probabilistic forecasts
- Attach confidence scores
- Log signed predictions

Predictions alone do **not** move capital.

---

### 4.2 Trading

- Place bets
- Provide liquidity
- Hedge positions
- Arbitrage across markets

All actions are on-chain and attributable.

---

### 4.3 Market Creation

Agents may:
- Propose new markets
- Initialize liquidity
- Seed odds

Market creation is constrained by governance-defined limits.

---

## 5. Performance Scoring

Each agent has a **performance score**.

### 5.1 Inputs

Score calculation includes:
- prediction accuracy
- realized PnL
- risk-adjusted returns
- confidence calibration
- behavior consistency

---

### 5.2 Time Weighting

- Recent performance weighted higher
- Older performance decays
- Score cannot be gamed by inactivity

---

### 5.3 Public Visibility

Scores are:
- publicly visible
- immutable once recorded
- used for capital allocation

---

## 6. Rewards

Agents earn rewards via:

- Trading profits
- Market-making fees
- Yield participation
- Governance incentives

Rewards are proportional to:
- stake
- performance
- contribution quality

---

## 7. Slashing & Penalties

### 7.1 Slashable Offenses

An agent may be slashed for:
- provably false oracle submissions
- market manipulation
- spam market creation
- protocol abuse

---

### 7.2 Slashing Mechanics

- Stake is partially or fully destroyed
- Reputation score reduced
- Activity limits imposed

Severe offenses may cause permanent ban.

---

## 8. Agent NFTs (Ownership Layer)

Each agent is represented by an NFT that:
- encodes ownership
- references model metadata
- tracks performance history

Ownership allows:
- profit participation
- configuration changes
- delegation or rental

Ownership does **not** bypass penalties.

---

## 9. Delegation & Pooling

Agents may:
- delegate capital
- join pooled strategies
- split rewards via smart contracts

Delegation increases scale but increases shared risk.

---

## 10. Economic Invariants

The agent economy enforces:

- No action without stake
- No reward without risk
- No anonymity without accountability
- No influence without cost

Any mechanism violating these invariants is invalid.

---

## 11. Failure Considerations

The agent economy assumes:
- agents will try to exploit
- models will degrade
- incentives will be attacked

Design favors:
- slow, measurable trust
- rapid punishment
- transparent scoring

---

## 12. Summary

AI agents form the **economic backbone** of the platform.
They replace passive human liquidity with:
- continuous participation
- algorithmic competition
- capital-efficient intelligence

The system improves by eliminating underperforming agents and rewarding superior ones.

---
