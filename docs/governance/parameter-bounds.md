# File: docs/governance/parameter-bounds.md

# Parameter Bounds
Unified AI–Crypto Prediction Market Platform

## 1. Purpose

This document defines **hard bounds** on all governance-controlled parameters.
These bounds exist to:
- prevent governance abuse
- limit blast radius of mistakes
- preserve economic invariants
- ensure predictability for participants

Governance may **adjust parameters**, but **never exceed defined bounds**.

---

## 2. Design Principles

Parameter bounds are:
- explicit
- conservative
- enforced on-chain
- auditable

No governance action may override these bounds.

---

## 3. Oracle Parameters

### 3.1 Minimum Oracle Stake

- Minimum: protocol-defined absolute floor
- Maximum: capped to prevent centralization

Purpose:
- prevent spam oracles
- avoid plutocratic dominance

---

### 3.2 Oracle Weight Cap

- Maximum voting weight per oracle enforced
- Prevents single-oracle dominance

Weight caps are immutable without contract upgrade.

---

### 3.3 Oracle Submission Window

- Minimum duration: ensures liveness
- Maximum duration: prevents resolution delays

---

## 4. Agent Parameters

### 4.1 Agent Stake Requirements

- Minimum stake proportional to activity
- Maximum leverage enforced

Prevents:
- undercollateralized agents
- excessive systemic risk

---

### 4.2 Agent Capital Allocation

- Upper bound on capital per agent
- Prevents dominance by single strategy

---

### 4.3 Agent Slashing Limits

- Minimum slash prevents spam
- Maximum slash prevents accidental total loss

---

## 5. Market Parameters

### 5.1 Market Creation Limits

- Rate limits per actor
- Capital requirements for creation

Prevents spam markets and noise flooding.

---

### 5.2 Market Duration

- Minimum duration prevents instant manipulation
- Maximum duration prevents perpetual uncertainty

---

### 5.3 Market Size

- Maximum total exposure per market
- Limits tail risk

---

## 6. Yield Parameters

### 6.1 Yield Exposure Caps

- Max percentage of idle capital per strategy
- Prevents overexposure

---

### 6.2 Strategy Risk Limits

- Risk score thresholds
- Strategy auto-disable conditions

---

## 7. Governance Parameters

### 7.1 Quorum Thresholds

- Minimum quorum required for any action
- Higher quorum for critical changes

---

### 7.2 Time-Lock Durations

- Minimum delay for execution
- Maximum delay to prevent governance paralysis

---

## 8. Emergency Controls

Emergency actions are bounded by:
- duration limits
- scope limits
- mandatory review

Emergency powers auto-expire.

---

## 9. Enforcement

All bounds are:
- enforced in smart contracts
- validated before execution
- emitted as events on violation attempt

Invalid proposals cannot be executed.

---

## 10. Upgrade Conditions

Parameter bounds may only be changed via:
- protocol upgrade
- supermajority governance vote
- external audit confirmation

No soft overrides allowed.

---

## 11. Failure Considerations

If bounds are incorrectly set:
- system favors safety over liveness
- features may pause rather than fail open

---

## 12. Summary

Parameter bounds are the protocol’s **guardrails**.
They ensure governance remains:
- predictable
- safe
- constrained

Any system without hard bounds is unsafe by design.

---
