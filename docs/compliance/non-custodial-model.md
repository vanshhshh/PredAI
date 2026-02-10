# File: docs/compliance/non-custodial-model.md

# Non-Custodial Model
Unified AI–Crypto Prediction Market Platform

## 1. Purpose

This document defines the **non-custodial design guarantees** of the platform.
At no point does the platform:
- take custody of user funds
- control private keys
- execute transactions without explicit authorization

All value movement is user- or agent-signed and enforced on-chain.

---

## 2. Core Non-Custodial Principles

The system enforces the following principles:

- Users and agents always control their keys
- Smart contracts hold funds, not servers
- Backend services never sign transactions
- Frontend only initiates user-approved actions

Any deviation from these principles is a critical violation.

---

## 3. Fund Custody Model

### 3.1 User Funds

User funds are:
- held in user wallets
- temporarily escrowed in smart contracts
- withdrawable per contract rules

No off-chain system can freeze or seize funds.

---

### 3.2 Agent Funds

AI agents:
- operate via on-chain identities
- hold capital in smart contracts
- cannot bypass custody rules

Agent automation never bypasses on-chain authorization.

---

### 3.3 Oracle Stakes

Oracle stakes:
- are locked in staking contracts
- are slashable only by contract logic
- cannot be accessed by governance arbitrarily

---

## 4. Transaction Authorization

### 4.1 User Authorization

All user actions require:
- explicit wallet signatures
- clear UI prompts
- deterministic transaction parameters

No hidden or background transactions are permitted.

---

### 4.2 Agent Authorization

Agents authorize actions via:
- pre-approved smart contract permissions
- bounded execution limits
- revocable delegation

Agent permissions are:
- explicit
- time-bound
- scope-limited

---

## 5. Backend Constraints

Backend services:
- cannot move funds
- cannot sign transactions
- cannot alter on-chain state directly

Backend influence is limited to:
- data indexing
- proposal submission
- simulation and analytics

---

## 6. Governance Constraints

Governance:
- cannot seize funds
- cannot override ownership
- cannot retroactively alter settlements

Governance actions are constrained by:
- smart contract invariants
- parameter bounds
- time-locks

---

## 7. Emergency Controls

Emergency actions may:
- pause contracts
- disable new actions
- restrict new market creation

Emergency actions may not:
- withdraw funds
- confiscate stakes
- alter balances

---

## 8. Attack Surface Considerations

### 8.1 Key Compromise

If a user or agent key is compromised:
- attacker gains only that key’s permissions
- protocol-wide damage is prevented

---

### 8.2 Backend Compromise

If backend infrastructure is compromised:
- no funds are at risk
- no settlement can be altered
- system can be rebuilt from chain state

---

## 9. Compliance Implications

The non-custodial model:
- reduces regulatory exposure
- avoids custody classification
- enables permissionless participation

Compliance responsibility rests with users and agents.

---

## 10. Invariants

The following must always hold:
- no private keys stored off-chain
- no backend-signed transactions
- no governance custody powers

Any violation mandates immediate shutdown.

---

## 11. Failure Considerations

If non-custodial guarantees are violated:
- trust is irreparably damaged
- funds may be at risk
- system must halt

Prevention is prioritized over recovery.

---

## 12. Summary

The non-custodial model is foundational.
Without it, the system loses:
- decentralization
- trust minimization
- legitimacy

All components must comply with this model without exception.

---
