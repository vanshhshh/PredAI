# File: docs/economics/oracle-incentives.md

# Oracle Incentives
Unified AI–Crypto Prediction Market Platform

## 1. Purpose

This document defines the **economic incentive model for decentralized AI oracles**.
Oracles are responsible for **truth resolution**, and must be:
- economically aligned
- adversarially robust
- independently verifiable

Accuracy is rewarded. Dishonesty is punished.

---

## 2. Oracle Role Definition

An **Oracle** is an entity that:
- observes external reality
- evaluates event outcomes deterministically
- submits signed claims on-chain
- stakes capital that is slashable

Oracles are **economically trusted**, not inherently trusted.

---

## 3. Oracle Lifecycle

### 3.1 Registration

An oracle must:
- register via `OracleRegistry`
- declare:
  - supported event categories
  - model types
  - data sources
  - confidence calibration method

Registration does not guarantee participation.

---

### 3.2 Staking

Before participating, an oracle must:
- lock a minimum stake
- accept slashing conditions
- agree to liveness requirements

Higher stake increases:
- voting weight
- reward potential
- slashing exposure

---

### 3.3 Activation

An oracle becomes active when:
- stake is locked
- health checks pass
- no unresolved penalties exist

Inactive oracles cannot submit results.

---

## 4. Oracle Submission Mechanics

### 4.1 Submission Contents

Each submission includes:
- outcome (boolean, categorical, or numeric)
- confidence score
- model/version hash
- timestamp
- cryptographic signature

Submissions are immutable once recorded.

---

### 4.2 Submission Window

- Each market defines a resolution window
- Submissions outside the window are ignored
- Non-submission is penalized

Liveness is as important as correctness.

---

## 5. Consensus & Weighting

### 5.1 Weight Calculation

Oracle voting weight is a function of:
- staked capital
- historical accuracy
- confidence calibration quality
- recent liveness

No single oracle may exceed a governance-defined weight cap.

---

### 5.2 Aggregation

Consensus is reached via:
- weighted aggregation
- confidence-adjusted voting
- outlier detection

Exact aggregation logic is deterministic and on-chain.

---

## 6. Rewards

### 6.1 Reward Sources

Oracles earn rewards from:
- market resolution fees
- protocol emissions
- governance incentives

---

### 6.2 Reward Distribution

Rewards are distributed based on:
- agreement with final consensus
- confidence accuracy
- timeliness of submission

Late or low-confidence submissions earn less.

---

## 7. Slashing & Penalties

### 7.1 Slashable Conditions

An oracle may be slashed for:
- submitting incorrect outcomes
- coordinated collusion
- repeated liveness failures
- protocol abuse

---

### 7.2 Slashing Severity

Slashing severity scales with:
- deviation from consensus
- stake size
- frequency of offense

Repeated offenses lead to permanent exclusion.

---

## 8. Dispute Resolution

### 8.1 Automatic Disputes

Disputes are automatically triggered when:
- consensus confidence is low
- oracle disagreement exceeds threshold

---

### 8.2 Governance Escalation

Governance may:
- override resolution
- slash malicious oracles
- update oracle parameters

Governance intervention is slow and auditable.

---

## 9. Economic Invariants

The oracle system enforces:

- No stake → no influence
- No accuracy → no rewards
- No liveness → penalties
- No anonymity → accountability

Any violation invalidates oracle participation.

---

## 10. Failure Considerations

The oracle system assumes:
- adversarial coordination
- data ambiguity
- model bias

Mitigations rely on:
- diversity of models
- economic penalties
- transparency of decisions

---

## 11. Summary

The oracle incentive system transforms truth into an economically enforced primitive.
Correctness is rewarded, dishonesty is destroyed, and uncertainty is explicitly modeled.

This enables fast, trust-minimized resolution at scale.

---
