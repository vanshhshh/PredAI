# File: docs/compliance/regulatory-surface.md

# Regulatory Surface
Unified AI–Crypto Prediction Market Platform

## 1. Purpose

This document defines the **regulatory surface area** of the platform.
The goal is to:
- explicitly identify points of regulatory interaction
- minimize centralized obligations
- preserve non-custodial, permissionless design
- allow jurisdiction-agnostic operation

This is **not legal advice**. It is an engineering document.

---

## 2. Regulatory Design Philosophy

The platform is designed to:
- avoid custody of funds
- avoid centralized control
- avoid discretionary decision-making
- avoid outcome manipulation

Regulatory exposure is reduced by architecture, not policy.

---

## 3. Core Regulatory Posture

### 3.1 Non-Custodial Operation

Because the platform:
- does not hold user funds
- does not control private keys
- does not execute transactions autonomously

It avoids classification as:
- custodian
- broker-dealer
- clearinghouse

---

### 3.2 Permissionless Participation

The system allows:
- open market creation
- open participation
- open oracle operation

No whitelisting is enforced at protocol level.

---

## 4. Prediction Market Classification

Prediction markets may intersect with:
- derivatives regulation
- gaming/betting laws
- event contracts

Mitigation strategy:
- markets are user-generated
- outcomes are resolved via decentralized oracles
- no centralized operator sets odds or outcomes

The protocol provides infrastructure, not contracts-for-difference.

---

## 5. AI Agent Considerations

AI agents:
- are user- or third-party operated
- act under on-chain constraints
- assume their own economic risk

The platform does not:
- deploy proprietary trading agents for users
- guarantee performance
- provide investment advice

---

## 6. Oracle Network Considerations

Oracle operators:
- act independently
- stake their own capital
- are economically liable for outcomes

The protocol does not:
- select oracle outcomes
- override consensus arbitrarily
- guarantee truth beyond economic incentives

---

## 7. Governance Considerations

Governance:
- is decentralized
- operates via on-chain voting
- is slow and transparent

Governance cannot:
- confiscate funds
- retroactively alter outcomes
- act without delay

---

## 8. Frontend & Interface Layer

The frontend:
- is an optional interface
- does not alter protocol behavior
- may be forked or replaced

The protocol exists independently of any UI.

---

## 9. Jurisdictional Variability

The platform:
- does not enforce geofencing at protocol level
- does not maintain user identities
- does not perform KYC by default

Compliance, where required, may be applied at:
- interface layer
- third-party integrations

---

## 10. Risk Disclosure

Users and agents assume:
- market risk
- oracle risk
- AI model risk
- smart contract risk

No guarantees are made.

---

## 11. Regulatory Failure Modes

If regulatory pressure increases:
- interfaces may restrict access
- markets may self-limit via governance
- protocol logic remains unchanged

Protocol immutability is prioritized.

---

## 12. Invariants

The following must always hold:
- no custodial control
- no discretionary outcome setting
- no opaque intervention

Any design violating these increases regulatory risk.

---

## 13. Summary

The platform minimizes regulatory exposure by:
- decentralization
- non-custodial design
- economic accountability
- transparency

Regulatory compliance is achieved through architecture, not promises.

---
