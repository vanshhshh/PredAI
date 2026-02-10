// File: frontend/types/yield.ts

/**
 * DOMAIN TYPES — YIELD / ARBITRAGE
 *
 * These are canonical UI-facing domain models.
 * Runtime / agent-specific states must be normalized
 * BEFORE entering these types.
 */

export type ArbitrageStatus =
  | "OPEN"
  | "EXECUTED"
  | "EXPIRED";

export interface ArbitrageOpportunity {
  opportunityId: string;

  /**
   * Human-readable route string
   * Example: "ETH → USDC → BTC"
   */
  route: string;

  /**
   * Gross spread percentage (e.g. 1.24 = 1.24%)
   */
  spread: number;

  /**
   * Confidence score 0–1 from AI agent
   */
  confidence: number;

  /**
   * Lifecycle state
   */
  status: ArbitrageStatus;

  /**
   * Unix timestamp (ms)
   */
  detectedAt: number;
}
