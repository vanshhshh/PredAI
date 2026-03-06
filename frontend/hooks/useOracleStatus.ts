// File: frontend/hooks/useOracleStatus.ts

/**
 * PURPOSE
 * -------
 * Oracle consensus & resolution state hook.
 *
 * This hook:
 * - fetches oracle consensus status for a given market
 * - exposes live resolution phase, confidence, quorum, submissions
 * - is read-only (no oracle submissions here)
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - Backend is the source of truth
 * - Poll-based (can be upgraded to WS later)
 * - Stable, UI-friendly state shape
 */

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export interface OracleSubmission {
  oracleId: string;
  outcome: "YES" | "NO";
  weight: number;
}

export interface OracleStatus {
  phase: "COLLECTING" | "FINALIZING" | "RESOLVED";
  confidence: number; // 0..1
  quorumReached: boolean;
  submissions: OracleSubmission[];
  resolvedAt?: number;
  finalOutcome?: "YES" | "NO";
}

export function useOracleStatus(marketId?: string) {
  const [status, setStatus] =
    useState<OracleStatus | null>(null);
  const [isLoading, setIsLoading] =
    useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] =
    useState<boolean>(false);
  const [error, setError] = useState<Error | null>(
    null
  );
  const hasLoadedRef = useRef(false);
  const inFlightRef = useRef(false);

  // ------------------------------------------------------------------
  // FETCH STATUS
  // ------------------------------------------------------------------

  const fetchStatus = useCallback(async () => {
    if (!marketId) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const initialLoad = !hasLoadedRef.current;
    if (initialLoad) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsRefreshing(true);
    }

    try {
      const res = await fetch(
        `/api/oracles/status?marketId=${encodeURIComponent(
          marketId
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error(
          "Failed to fetch oracle status"
        );
      }

      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      inFlightRef.current = false;
      hasLoadedRef.current = true;
      if (initialLoad) {
        setIsLoading(false);
      } else {
        setIsRefreshing(false);
      }
    }
  }, [marketId]);

  useEffect(() => {
    hasLoadedRef.current = false;
    setStatus(null);
    setError(null);
    setIsLoading(false);
    setIsRefreshing(false);
  }, [marketId]);

  useEffect(() => {
    fetchStatus();

    const pollMsRaw = process.env.NEXT_PUBLIC_ORACLE_POLL_INTERVAL_MS ?? "0";
    const pollMs = Number.parseInt(pollMsRaw, 10);
    if (!Number.isFinite(pollMs) || pollMs <= 0) {
      return;
    }

    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fetchStatus();
    }, pollMs);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // ------------------------------------------------------------------
  // PUBLIC API
  // ------------------------------------------------------------------

  return {
    status,
    isLoading,
    isRefreshing,
    error,
    refetch: fetchStatus,
  };
}
