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

  /* ------------------------------------------------------------------ */
  /* FETCH FEEDS */
  /* ------------------------------------------------------------------ */

  const fetchFeeds = useCallback(async () => {
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
      setFeeds(data.feeds ?? data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
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

    const interval = setInterval(fetchFeeds, 15_000);
    return () => clearInterval(interval);
  }, [fetchFeeds]);

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
          const text = await res.text();
          throw new Error(text || "Market spawn failed");
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
          const text = await res.text();
          throw new Error(text || "Stake failed");
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
          const text = await res.text();
          throw new Error(
            text || "Prompt compilation failed"
          );
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
    error,

    refetch: fetchFeeds,

    spawnMarket,
    spawnMarketFromFeed: spawnMarket, // alias for UI
    stakeOnArgument,
    compilePrompt,
  };
}
