// File: frontend/state/slices/oraclesSlice.ts

/**
 * PURPOSE
 * -------
 * Global oracle resolution state slice.
 *
 * This slice:
 * - tracks oracle consensus per market
 * - stores submissions, confidence, quorum state
 * - is read-only from UI perspective
 *
 * IMPORTANT
 * ---------
 * - No oracle submission logic here
 * - Backend & contracts are authoritative
 */

import { StateCreator } from "zustand";

export interface OracleSubmissionState {
  oracleId: string;
  outcome: "YES" | "NO";
  weight: number;
}

export interface OracleStatusState {
  marketId: string;
  phase: "COLLECTING" | "FINALIZING" | "RESOLVED";
  confidence: number; // 0..1
  quorumReached: boolean;
  submissions: OracleSubmissionState[];
  resolvedAt?: number;
  finalOutcome?: "YES" | "NO";
}

export interface OraclesSlice {
  oracleStatusByMarket: Record<string, OracleStatusState>;

  setOracleStatus: (status: OracleStatusState) => void;
  clearOracleStatus: (marketId: string) => void;
}

export const createOraclesSlice: StateCreator<
  OraclesSlice,
  [],
  [],
  OraclesSlice
> = (set) => ({
  oracleStatusByMarket: {},

  setOracleStatus: (status) => {
    set((state) => ({
      oracleStatusByMarket: {
        ...state.oracleStatusByMarket,
        [status.marketId]: status,
      },
    }));
  },

  clearOracleStatus: (marketId) => {
    set((state) => {
      const copy = { ...state.oracleStatusByMarket };
      delete copy[marketId];
      return { oracleStatusByMarket: copy };
    });
  },
});
