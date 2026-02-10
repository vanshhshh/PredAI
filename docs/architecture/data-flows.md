# Data Flows
Unified AI–Crypto Prediction Market Platform

## 1. Purpose

This document defines **all authoritative data flows** in the system.
It specifies:
- where data originates
- how it is transformed
- where it is consumed
- which component is the source of truth

No component may invent or assume data outside these flows.

---

## 2. Canonical Sources of Truth

| Data Type | Source of Truth |
|---------|----------------|
| Market state | Blockchain events |
| Bets, liquidity | Blockchain events |
| Agent capital & stakes | Blockchain events |
| Oracle submissions | Blockchain events |
| Settlements | Blockchain events |
| Derived analytics | Backend indexed state |
| AI predictions | AI inference outputs (signed + logged) |
| Social signals | External APIs (ingested, timestamped) |

Only **blockchain state** is final.

---

## 3. Market Lifecycle Data Flow

### 3.1 Market Creation

**Initiator**
- Human user (frontend)
- AI agent (backend-triggered)

**Flow**
1. Market prompt submitted via frontend or backend
2. Backend validates structure and constraints
3. Smart contract `MarketFactory` creates market
4. `MarketCreated` event emitted
5. Backend indexer ingests event
6. Frontend reflects new market via indexed API

**Notes**
- NLP interpretation never directly creates contracts
- Market creation always requires explicit on-chain transaction

---

### 3.2 Betting & Liquidity Provision

**Flow**
1. User or agent submits transaction
2. Smart contract updates balances
3. Event emitted (`BetPlaced`, `LiquidityAdded`)
4. Backend indexer records immutable event
5. Derived state (odds, exposure) recalculated
6. Frontend updates via polling or WebSocket

**Failure Handling**
- Transaction reverts → frontend surfaces error
- Chain reorg → backend replays events

---

## 4. AI Agent Data Flow

### 4.1 Prediction Generation

**Flow**
1. Agent pulls:
   - historical market data
   - oracle confidence history
   - social sentiment
2. Agent generates prediction + confidence
3. Prediction is:
   - signed
   - timestamped
   - logged
4. Prediction optionally triggers:
   - bet
   - liquidity adjustment
   - arbitrage action

Predictions alone do **not** affect settlement.

---

### 4.2 Agent Economic Actions

**Flow**
1. Agent submits on-chain transaction
2. Capital is locked or moved
3. Performance tracked via realized outcomes
4. Scores updated post-settlement

Agents are economically indistinguishable from humans.

---

## 5. Oracle Resolution Flow

### 5.1 Oracle Submission

**Flow**
1. Oracle node observes event
2. Oracle runs deterministic evaluation
3. Result + confidence submitted on-chain
4. Submission recorded in `OracleConsensus`

Each submission is:
- signed
- attributable
- slashable

---

### 5.2 Consensus & Finalization

**Flow**
1. Consensus window closes
2. Weighted aggregation executed
3. Final outcome emitted
4. Settlement engine triggers payouts
5. Slashing or rewards applied

Disagreement is expected and modeled.

---

## 6. Yield & Capital Routing Flow

### 6.1 Idle Capital Detection

**Flow**
1. Backend identifies idle balances
2. Risk profile evaluated
3. Eligible yield strategies selected

---

### 6.2 Yield Deployment

**Flow**
1. Capital routed via `CapitalRouter`
2. Funds deployed into approved vaults
3. Yield accrued on-chain
4. Yield attributed to owners

Yield never compromises principal availability for settlement.

---

## 7. Social Signal Flow

### 7.1 Ingestion

**Flow**
1. Social APIs polled or streamed
2. Raw data stored with timestamps
3. Noise filtering applied
4. Signals forwarded to AI agents

Social data never directly triggers trades without agent action.

---

### 7.2 Market Auto-Spawning

**Flow**
1. Signal crosses relevance threshold
2. AI agent proposes market
3. Proposal reviewed against constraints
4. On-chain creation initiated

Humans may veto or participate post-creation.

---

## 8. Frontend Consumption Flow

Frontend only consumes:
- backend APIs
- indexed chain data
- signed AI outputs

Frontend never:
- computes odds
- resolves markets
- assumes transaction success

---

## 9. Replay & Recovery

All backend state can be rebuilt by:
1. Replaying blockchain events
2. Reprocessing oracle submissions
3. Recomputing derived metrics

This guarantees recoverability and auditability.

---

## 10. Summary

Every data path in the system:
- is explicit
- is traceable
- has a single source of truth
- supports replay and audit

Any feature that violates these flows is invalid by design.

---
