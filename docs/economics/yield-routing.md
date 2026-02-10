# File: docs/economics/yield-routing.md

# Yield Routing
Unified AI–Crypto Prediction Market Platform

## 1. Purpose

This document defines the **Yield Routing System**, which ensures that capital within the platform:
- is never idle without justification
- remains available for market settlement
- is deployed in risk-aware yield strategies
- is transparently attributable to owners

Prediction markets are treated as **productive financial primitives**, not dead pools.

---

## 2. Capital Categories

All capital in the system is classified into one of the following categories:

### 2.1 Active Capital
- Capital currently:
  - backing open bets
  - providing liquidity
  - staked by agents or oracles

Active capital is **never** routed to yield.

---

### 2.2 Idle Capital
- Capital that is:
  - not currently backing positions
  - not locked by protocol rules
  - withdrawable on demand

Only idle capital is eligible for yield routing.

---

### 2.3 Reserved Capital
- Capital earmarked for:
  - pending settlements
  - dispute windows
  - slashing buffers

Reserved capital is never yield-routed.

---

## 3. Yield Routing Objectives

The routing system optimizes for:
1. **Capital safety**
2. **Settlement availability**
3. **Risk-adjusted yield**
4. **Transparency**

Yield maximization is explicitly secondary to safety.

---

## 4. Yield Strategy Types

### 4.1 Low-Risk Strategies
Examples:
- Lending to over-collateralized protocols
- Stablecoin vaults
- Native staking (where applicable)

Characteristics:
- High liquidity
- Low volatility
- Fast exit guarantees

---

### 4.2 Medium-Risk Strategies
Examples:
- Liquidity provision in deep pools
- Delta-neutral strategies

Characteristics:
- Moderate volatility
- Predictable drawdowns
- Exit within bounded time

---

### 4.3 High-Risk Strategies (Restricted)

Examples:
- Exotic yield strategies
- Leverage-based protocols

Characteristics:
- Higher returns
- Higher drawdowns
- Strict caps and opt-in only

High-risk strategies are disabled by default.

---

## 5. Risk Assessment Framework

Each yield strategy is evaluated using:
- historical volatility
- liquidity depth
- smart contract risk
- oracle dependency
- exit latency

Risk scores are computed off-chain and enforced on-chain.

---

## 6. Capital Allocation Logic

### 6.1 Allocation Constraints

Capital routing must satisfy:
- minimum liquidity buffers
- maximum strategy exposure
- per-user and per-agent limits

No strategy may exceed governance-defined caps.

---

### 6.2 Dynamic Rebalancing

Rebalancing occurs when:
- market volatility spikes
- settlement windows approach
- strategy risk profile changes

Rebalancing prioritizes:
1. capital safety
2. settlement readiness
3. yield preservation

---

## 7. Execution Mechanics

### 7.1 Routing Execution

1. Backend identifies eligible idle capital
2. Risk engine selects strategies
3. On-chain `CapitalRouter` executes deployment
4. Vault contracts hold funds
5. Yield accrues on-chain

All routing actions emit events.

---

### 7.2 Exit Guarantees

All yield strategies must provide:
- deterministic exit paths
- bounded withdrawal time
- priority settlement access

If exit guarantees are violated, the strategy is disabled.

---

## 8. Attribution & Accounting

Yield is attributed:
- per user
- per agent
- per vault
- per time window

Accounting is:
- deterministic
- replayable
- auditable

---

## 9. Failure Modes

### 9.1 Strategy Failure

If a strategy:
- underperforms beyond threshold
- experiences exploit risk
- violates exit guarantees

Response:
- immediate withdrawal
- strategy deactivation
- governance review

---

### 9.2 Liquidity Crunch

If settlement demand exceeds buffers:
- yield positions are exited immediately
- new routing is paused
- settlement is prioritized

Yield never blocks settlement.

---

## 10. Governance Controls

Governance may:
- approve or disable strategies
- set exposure caps
- adjust risk thresholds
- pause routing globally

All changes are time-locked.

---

## 11. Economic Invariants

The yield system enforces:

- Settlement > Yield
- Safety > Returns
- Transparency > Optimization
- Determinism > Opportunism

Any yield mechanism violating these invariants is invalid.

---

## 12. Summary

Yield routing transforms prediction markets into capital-efficient systems without compromising safety.

Capital works continuously, but never at the expense of market integrity.

---
