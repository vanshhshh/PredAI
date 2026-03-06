// File: frontend/hooks/useSocialFeeds.ts

/**
 * PURPOSE
 * -------
 * Social signal ingestion + market spawning hook.
 *
 * This hook:
 * - fetches AI-processed social feed items
 * - exposes signal strength & market eligibility
 * - triggers market creation from social signals
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Backend is the source of truth
 * - No mock data
 * - Read-heavy, write-light
 * - Safe for polling or streaming upgrades
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* TYPES */
/* ------------------------------------------------------------------ */

export interface SocialFeedItem {
  id: string;
  source: "X" | "FARCASTER" | "ONCHAIN" | "OTHER";
  author: string;
  content: string;
  timestamp: number;
  signalScore?: number; // 0..1
  marketEligible?: boolean;
}

function extractApiErrorMessage(payload: unknown, depth = 0): string | null {
  if (depth > 4 || payload === null || payload === undefined) return null;

  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (!trimmed) return null;
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        return extractApiErrorMessage(parsed, depth + 1) ?? trimmed;
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }

  if (typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;

  return (
    extractApiErrorMessage(record.error, depth + 1) ??
    extractApiErrorMessage(record.detail, depth + 1) ??
    extractApiErrorMessage(record.message, depth + 1)
  );
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as unknown;
    return extractApiErrorMessage(payload) ?? fallback;
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* HOOK */
/* ------------------------------------------------------------------ */

export function useSocialFeeds() {
  const [feeds, setFeeds] = useState<SocialFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSpawning, setIsSpawning] = useState<boolean>(false);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const hasLoadedRef = useRef(false);
  const inFlightRef = useRef(false);
  const pollIntervalMs = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_SOCIAL_POLL_INTERVAL_MS ?? "0";
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 0;
    }
    return parsed;
  }, []);

  /* ------------------------------------------------------------------ */
  /* FETCH FEEDS */
  /* ------------------------------------------------------------------ */

  const fetchFeeds = useCallback(async () => {
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
      const res = await fetch("/api/social/feeds", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch social feeds");
      }

      const data = await res.json();
      const incoming = Array.isArray(data?.feeds)
        ? (data.feeds as SocialFeedItem[])
        : Array.isArray(data)
        ? (data as SocialFeedItem[])
        : [];
      setFeeds((prev) => {
        // Keep prior feed list if a refresh temporarily returns empty.
        if (!initialLoad && incoming.length === 0 && prev.length > 0) {
          return prev;
        }
        return incoming;
      });
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
  }, []);

  useEffect(() => {
    fetchFeeds();

    if (pollIntervalMs <= 0) {
      return;
    }

    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void fetchFeeds();
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchFeeds, pollIntervalMs]);

  /* ------------------------------------------------------------------ */
  /* DERIVED: ARGUMENT FEED */
  /* ------------------------------------------------------------------ */

  const argumentsFeed = useMemo(() => {
    return feeds.filter(
      (f) =>
        typeof f.signalScore === "number" &&
        f.signalScore > 0.5
    );
  }, [feeds]);

  /* ------------------------------------------------------------------ */
  /* SPAWN MARKET */
  /* ------------------------------------------------------------------ */

  const spawnMarket = useCallback(
    async (feedId: string) => {
      setIsSpawning(true);
      setError(null);

      try {
        const res = await fetch("/api/social/spawn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedId }),
        });

        if (!res.ok) {
          throw new Error(await readApiError(res, "Market spawn failed"));
        }

        await fetchFeeds();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSpawning(false);
      }
    },
    [fetchFeeds]
  );

  /* ------------------------------------------------------------------ */
  /* STAKE ON ARGUMENT */
  /* ------------------------------------------------------------------ */

  const stakeOnArgument = useCallback(
    async (argumentId: string, amount: number) => {
      setIsSpawning(true);
      setError(null);

      try {
        const res = await fetch("/api/social/stake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ argumentId, amount }),
        });

        if (!res.ok) {
          throw new Error(await readApiError(res, "Stake failed"));
        }

        await fetchFeeds();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsSpawning(false);
      }
    },
    [fetchFeeds]
  );

  /* ------------------------------------------------------------------ */
  /* COMPILE PROMPT */
  /* ------------------------------------------------------------------ */

  const compilePrompt = useCallback(
    async (prompt: string) => {
      setIsCompiling(true);
      setError(null);

      try {
        const res = await fetch("/api/social/compile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (!res.ok) {
          throw new Error(await readApiError(res, "Prompt compilation failed"));
        }

        return await res.json();
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsCompiling(false);
      }
    },
    []
  );

  /* ------------------------------------------------------------------ */
  /* PUBLIC API — STABLE CONTRACT */
  /* ------------------------------------------------------------------ */

  return {
    feeds,
    argumentsFeed,

    isLoading,
    isRefreshing,
    isSpawning,
    isCompiling,
    pollIntervalMs,
    error,

    refetch: fetchFeeds,

    spawnMarket,
    spawnMarketFromFeed: spawnMarket, // alias for UI
    stakeOnArgument,
    compilePrompt,
  };
}
