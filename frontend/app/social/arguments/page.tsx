// File: frontend/app/social/arguments/page.tsx

/**
 * PURPOSE
 * -------
 * Stakeable reasoning / argument markets page.
 *
 * This page:
 * - displays arguments extracted from social & agent reasoning
 * - allows users to stake on arguments they believe are correct
 * - shows argument confidence, backing stake, and resolution status
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - Argument = first-class financial primitive
 * - Clear risk + confidence signaling
 * - Defensive UX (loading, error, empty)
 */

"use client";

import React, { useMemo } from "react";

import { useSocialFeeds } from "../../../hooks/useSocialFeeds";
import { useWallet } from "../../../hooks/useWallet";

import { LoadingSpinner } from "../../../components/Shared/LoadingSpinner";
import { ErrorBoundary } from "../../../components/Shared/ErrorBoundary";

import { ArgumentStaker } from "../../../components/Social/ArgumentStaker";

/**
 * Canonical Argument type expected by ArgumentStaker
 */
interface Argument {
  argumentId: string;
  text: string;
  confidence: number;
  totalStake: number;
  resolved: boolean;
}

export default function SocialArgumentsPage() {
  return (
    <ErrorBoundary>
      <ArgumentsContent />
    </ErrorBoundary>
  );
}

function ArgumentsContent() {
  const { isConnected } = useWallet();
  const { feeds, isLoading, error } = useSocialFeeds();

  // ------------------------------------------------------------------
  // ADAPT SOCIAL FEEDS → ARGUMENTS
  // ------------------------------------------------------------------

  const argumentsFeed: Argument[] = useMemo(() => {
    return feeds
      .filter(
        (f) =>
          typeof f.signalScore === "number" &&
          f.signalScore > 0
      )
      .map((f) => ({
        argumentId: f.id,
        text: f.content,
        confidence: f.signalScore ?? 0,
        totalStake: 0, // backend-owned (real later)
        resolved: false,
      }));
  }, [feeds]);

  // ------------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------------

  if (isLoading) {
    return <LoadingSpinner label="Loading arguments…" />;
  }

  // ------------------------------------------------------------------
  // ERROR
  // ------------------------------------------------------------------

  if (error) {
    return (
      <div className="p-6 border rounded-md bg-red-50">
        <h3 className="font-semibold text-red-700">
          Failed to load arguments
        </h3>
        <p className="text-sm text-red-600 mt-2">
          {error.message}
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // EMPTY
  // ------------------------------------------------------------------

  if (argumentsFeed.length === 0) {
    return (
      <div className="p-6 border rounded-md bg-gray-50">
        <h3 className="font-semibold">
          No arguments available
        </h3>
        <p className="text-sm text-gray-600 mt-2">
          No stakeable arguments have been generated yet.
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // MAIN
  // ------------------------------------------------------------------

  return (
    <main className="px-6 py-8 space-y-8 max-w-6xl mx-auto">
      <header>
        <h1 className="text-2xl font-semibold">
          Arguments
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Stake on reasoning primitives extracted from
          social signals.
        </p>
      </header>

      <ArgumentStaker
        items={argumentsFeed}
        isConnected={isConnected}
        onStake={
          isConnected
            ? async ({ argumentId, amount }) => {
                // 🔒 intentionally backend-only later
                console.log(
                  "Stake on argument",
                  argumentId,
                  amount
                );
              }
            : undefined
        }
      />
    </main>
  );
}
