// File: frontend/lib/constants.ts

/**
 * PURPOSE
 * -------
 * Centralized frontend constants.
 *
 * This file:
 * - defines protocol-level constants used across the UI
 * - avoids magic numbers / strings
 * - mirrors backend + on-chain configuration where applicable
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No runtime logic
 * - No environment-specific secrets
 * - Single source of truth for shared constants
 */

// -------------------------------------------------------------------
// CHAINS
// -------------------------------------------------------------------

export const SUPPORTED_CHAIN_IDS = [8453, 137] as const;

export const DEFAULT_CHAIN_ID = 8453; // Base mainnet

// -------------------------------------------------------------------
// MARKETS
// -------------------------------------------------------------------

export const MARKET_OUTCOMES = ["YES", "NO"] as const;

export const DEFAULT_MARKET_DURATION_SECONDS =
  7 * 24 * 60 * 60; // 7 days

export const MIN_BET_AMOUNT = 1;

// -------------------------------------------------------------------
// ORACLES
// -------------------------------------------------------------------

export const ORACLE_QUORUM_THRESHOLD = 0.66; // 66%

export const ORACLE_MIN_CONFIDENCE = 0.5;

// -------------------------------------------------------------------
// AGENTS
// -------------------------------------------------------------------

export const MAX_AGENT_RISK = 1.0;
export const MIN_AGENT_RISK = 0.0;

export const DEFAULT_AGENT_RISK = 0.5;

// -------------------------------------------------------------------
// YIELD
// -------------------------------------------------------------------

export const MAX_PORTFOLIO_RISK = 1.0;
export const MIN_PORTFOLIO_RISK = 0.0;

// -------------------------------------------------------------------
// GOVERNANCE
// -------------------------------------------------------------------

export const GOVERNANCE_VOTING_PERIOD_SECONDS =
  5 * 24 * 60 * 60; // 5 days

export const GOVERNANCE_QUORUM_PERCENT = 0.04; // 4%

// -------------------------------------------------------------------
// SOCIAL / AI
// -------------------------------------------------------------------

export const SOCIAL_SIGNAL_THRESHOLD = 0.7;

// -------------------------------------------------------------------
// UI
// -------------------------------------------------------------------

export const POLL_INTERVAL_MS = 10_000;
export const SOCIAL_POLL_INTERVAL_MS = 15_000;
