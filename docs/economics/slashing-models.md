# File: docs/economics/slashing-models.md

# Slashing Models
Unified AI–Crypto Prediction Market Platform

## 1. Purpose

This document specifies the **slashing framework** used to enforce honest behavior across:
- AI agents
- Oracle nodes
- Delegated capital pools

Slashing is the primary enforcement mechanism that converts **misbehavior into economic loss**.

---

## 2. Design Principles

The slashing system is designed to be:

- **Deterministic** — rules are explicit and computable
- **Proportional** — penalties scale with impact and stake
- **Attributable** — every slash is tied to an identity
- **Auditable** — all slashes are on-chain and replayable
- **Escalatory** — repeat offenses incur harsher penalties

No discretionary or opaque slashing is permitted.

---

## 3. Slashable Actors

### 3.1 AI Agents

Agents may be slashed for:
- market manipulation
- oracle spam
- wash trading
- false signaling intended to mislead
- protocol abuse

Agents are assumed adversarial by default.

---

### 3.2 Oracles

Oracles may be slashed for:
- incorrect submissions
- collusion
- repeated liveness failures
- submitting unverifiable results

Oracles are economically trusted but not immune.

---

### 3.3 Delegators

Delegators are slashed **indirectly**:
- proportional to their delegated stake
- based on the actions of the delegatee

Delegation implies shared risk.

---

## 4. Slashing Triggers

### 4.1 Deterministic Triggers

Triggered automatically when:
- oracle consensus disagrees with submission
- provable invariant violation occurs
- repeated missed submission windows

These require no human intervention.

---

### 4.2 Probabilistic Triggers

Triggered when:
- abnormal behavioral patterns detected
- statistical anomaly thresholds exceeded

These require confirmation before execution.

---

### 4.3 Governance Triggers

Triggered via:
- formal proposal
- quorum approval
- time-locked execution

Used only for systemic or coordinated attacks.

---

## 5. Slashing Severity Model

### 5.1 Base Severity

Base slash amount is a function of:
- stake size
- deviation magnitude
- role criticality

base_slash = stake × deviation_factor × role_weight


---

### 5.2 Escalation

Escalation applies when:
- offenses repeat
- severity accumulates over time

Escalation curve is exponential but capped.

---

### 5.3 Caps and Floors

- Minimum slash prevents spam
- Maximum slash prevents total wipeout unless malicious intent is proven

Caps are governance-controlled.

---

## 6. Execution Mechanics

### 6.1 On-Chain Execution

All slashing:
- executes on-chain
- emits events
- updates reputation scores

No off-chain slashing is allowed.

---

### 6.2 Distribution of Slashed Funds

Slashed funds may be:
- burned
- redistributed to honest participants
- allocated to insurance reserves

Distribution policy is governance-defined.

---

## 7. Reputation Impact

Slashing affects:
- reputation score
- future participation limits
- reward multipliers

Reputation decay is slower than capital loss.

---

## 8. Recovery & Rehabilitation

### 8.1 Cooling-Off Period

After slashing:
- actor enters cooldown
- activity is limited
- monitoring increases

---

### 8.2 Rehabilitation

Actors may recover via:
- sustained honest behavior
- capital replenishment
- governance approval (rare)

Permanent bans are possible for severe offenses.

---

## 9. Failure Considerations

Slashing assumes:
- false positives are possible
- adversaries will probe thresholds

Mitigations include:
- conservative thresholds
- layered triggers
- appeal via governance

---

## 10. Economic Invariants

The slashing system enforces:

- Misbehavior is always costly
- Repeated abuse is unsustainable
- Honest participation is economically dominant

Any system bypassing slashing is invalid.

---

## 11. Summary

Slashing is the backbone of trust minimization.
It ensures that:
- accuracy is rewarded
- dishonesty is punished
- the system self-stabilizes over time

Without slashing, the system cannot remain decentralized or secure.
