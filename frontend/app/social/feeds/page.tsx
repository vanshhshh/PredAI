// File: frontend/app/social/feeds/page.tsx

/**
 * PURPOSE
 * -------
 * Social feeds monitoring & market auto-spawn page.
 *
 * This page:
 * - monitors social feeds (e.g. X / Web3 social graphs)
 * - displays real-time posts/events being tracked by agents
 * - allows users to spawn markets from social prompts
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - Streaming-first UI
 * - AI-assisted but user-controlled actions
 * - Defensive UX (loading, error, empty)
 */

"use client";

import React from "react";

import { useSocialFeeds } from "../../../hooks/useSocialFeeds";
import { useWallet } from "../../../hooks/useWallet";

import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";

import { FeedMonitor } from "../../../components/Social/FeedMonitor";
import { PromptCompiler } from "../../../components/Social/PromptCompiler";

export default function SocialFeedsPage() {
  return (
    <ErrorBoundary>
      <SocialFeedsContent />
    </ErrorBoundary>
  );
}

function SocialFeedsContent() {
  const { isConnected } = useWallet();
  const {
    feeds,
    isLoading,
    error,
    spawnMarketFromFeed,
  } = useSocialFeeds();

  // ------------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------------

  if (isLoading) {
    return <LoadingSpinner label="Loading social feeds…" />;
  }

  // ------------------------------------------------------------------
  // ERROR
  // ------------------------------------------------------------------

  if (error) {
    return (
      <div className="p-6 border rounded-md bg-red-50">
        <h3 className="font-semibold text-red-700">
          Failed to load social feeds
        </h3>
        <p className="text-sm text-red-600 mt-2">{error.message}</p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // EMPTY
  // ------------------------------------------------------------------

  if (!feeds || feeds.length === 0) {
    return (
      <div className="p-6 border rounded-md bg-gray-50">
        <h3 className="font-semibold">No social activity</h3>
        <p className="text-sm text-gray-600 mt-2">
          No monitored social feeds are active right now.
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // MAIN
  // ------------------------------------------------------------------

  return (
    <main className="px-6 py-8 space-y-10 max-w-6xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold">Social Feeds</h1>
        <p className="text-sm text-gray-600 mt-1">
          Live social signals monitored by AI agents.
        </p>
      </header>

      {/* Feed Stream */}
      <section>
        <FeedMonitor
          feeds={feeds}
          onSpawnMarket={
            isConnected ? spawnMarketFromFeed : undefined
          }
        />
      </section>

      {/* Prompt Compiler */}
      <section>
        <PromptCompiler />
      </section>
    </main>
  );
}
