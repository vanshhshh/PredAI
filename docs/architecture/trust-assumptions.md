# Trust Assumptions
Unified AI–Crypto Prediction Market Platform

## 1. Purpose

This document enumerates **all explicit trust assumptions** in the system.
Every assumption listed here is intentional, documented, and enforced by design.

Anything not explicitly trusted is assumed to be:
- adversarial
- faulty
- or unavailable

This document is binding for all implementation decisions.

---

## 2. Trust Philosophy

The system follows a **minimized-trust, adversarial-by-default** model.

Core principles:
- Capital must never depend on goodwill
- No single actor may unilaterally decide outcomes
- Every economically relevant action must be attributable
- Failure must be observable, not silent

---

## 3. Trusted Components

### 3.1 Blockchain Layer

**Assumptions**
- The underlying blockchain provides:
  - liveness
  - probabilistic finality
  - transaction ordering guarantees

**Trust Scope**
- Smart contracts are trusted *only after audit*
- Consensus failures are considered catastrophic but external

**Mitigations**
- Conservative contract logic
- Emergency pause mechanisms
- Upgrade paths via governance

---

### 3.2 Smart Contracts

**Assumptions**
- Contracts execute deterministically
- State transitions follow defined invariants
- Upgrade mechanisms are not abused

**Explicitly Not Trusted**
- Contract callers
- Off-chain data sources
- Transaction ordering (MEV exists)

**Mitigations**
- Reentrancy protection
- Invariant checks
- Minimal on-chain logic
- Slashing for malicious interactions where applicable

---

### 3.3 Oracle Network (Conditional Trust)

Oracles are **economically trusted**, not intrinsically trusted.

**Assumptions**
- A majority of staked oracle weight is honest
- Dishonest behavior is economically irrational long-term

**Failure Model**
- Individual oracle failures expected
- Collusion is possible but costly
- Incorrect consensus is slashable

**Mitigations**
- Multi-model ensembles
- Weighted consensus
- Slashing and reputation decay
- Governance intervention as last resort

---

## 4. Untrusted Components

### 4.1 AI Agents

AI agents are assumed to be:
- profit-maximizing
- adversarial
- capable of manipulation

They are **never trusted**, only constrained.

**Mitigations**
- Mandatory staking
- Performance-based scoring
- Slashing on provable misconduct
- No unilateral authority over settlement

---

### 4.2 Backend Services

Backend services are assumed to be:
- crashable
- censorable
- replaceable

**Backend trust level**
- Zero for custody
- Limited for availability
- Observable for correctness

**Mitigations**
- No custody of funds
- Event replay capability
- Deterministic APIs
- Multiple indexers possible

---

### 4.3 Frontend Clients

Frontend applications are:
- fully untrusted
- user-modifiable
- hostile by default

**Mitigations**
- All validation on-chain or backend
- Explicit user confirmations
- No hidden execution paths

---

## 5. External Data Sources

### 5.1 Social APIs

Social data is assumed to be:
- noisy
- biased
- manipulable

**Mitigations**
- Signal aggregation
- Confidence scoring
- No direct execution authority

---

### 5.2 AI Models

Models are assumed to:
- drift over time
- exhibit bias
- be exploitable

**Mitigations**
- Versioning
- Confidence outputs
- Drift detection
- Performance decay penalties

---

## 6. Governance Trust

Governance is trusted to:
- act slowly
- act transparently
- act conservatively

Governance is **not trusted** for:
- rapid intervention
- micromanagement
- speculative tuning

**Mitigations**
- Timelocks
- Parameter bounds
- Emergency-only powers

---

## 7. Economic Trust Boundaries

| Component | Trust Type |
|---------|------------|
| Users | Untrusted |
| AI Agents | Untrusted |
| Oracles | Economically Trusted |
| Backend | Untrusted |
| Frontend | Untrusted |
| Blockchain | Conditionally Trusted |
| Governance | Bounded Trust |

---

## 8. Explicit Non-Assumptions

The system does **not** assume:
- Honest users
- Accurate AI
- Reliable backend uptime
- Fair transaction ordering
- Stable market conditions

---

## 9. Trust Evolution

Trust levels may evolve **only via governance**.
No code changes may silently expand trust assumptions.

Any new trust assumption requires:
- documentation update
- governance approval
- audit review

---

## 10. Summary

This system is designed to operate correctly even when:
- participants act maliciously
- AI behaves unpredictably
- infrastructure partially fails

Only cryptographic guarantees and economic incentives are relied upon.

---
