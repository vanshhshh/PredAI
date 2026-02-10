// File: frontend/lib/tx.ts

/**
 * PURPOSE
 * -------
 * Transaction lifecycle helpers (frontend-side).
 *
 * This module:
 * - standardizes transaction state tracking
 * - provides helpers for pending / success / failure flows
 * - avoids duplicated tx-state logic across components
 *
 * IMPORTANT
 * ---------
 * - This does NOT sign or send transactions
 * - Signing happens in wallet / backend layers
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Pure helpers
 * - Deterministic state transitions
 * - UI-friendly abstractions
 */

export type TxStatus =
  | "IDLE"
  | "PENDING"
  | "SUCCESS"
  | "ERROR";

export interface TxState {
  status: TxStatus;
  hash?: string;
  error?: string;
}

export function createIdleTx(): TxState {
  return { status: "IDLE" };
}

export function pendingTx(
  hash?: string
): TxState {
  return {
    status: "PENDING",
    hash,
  };
}

export function successTx(
  hash?: string
): TxState {
  return {
    status: "SUCCESS",
    hash,
  };
}

export function errorTx(
  error: string
): TxState {
  return {
    status: "ERROR",
    error,
  };
}

export function isFinal(status: TxStatus): boolean {
  return status === "SUCCESS" || status === "ERROR";
}
