// File: frontend/app/markets/error.tsx

/**
 * PURPOSE
 * -------
 * Error boundary UI for the markets route segment.
 *
 * This file:
 * - handles runtime errors specific to /markets/*
 * - provides a graceful recovery path
 * - prevents full-app crashes
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No business logic
 * - Clear user messaging
 * - Retry capability
 * - Production-safe fallback UI
 */

// File: frontend/app/markets/error.tsx

"use client";

import React from "react";
import Link from "next/link";

interface MarketsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MarketsError({
  error,
  reset,
}: MarketsErrorProps) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-neutral-50 to-white px-6">
      <div className="max-w-lg w-full rounded-3xl border border-neutral-200 bg-white p-10 shadow-sm space-y-6">

        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <div className="w-5 h-5 bg-red-500 rounded-full animate-pulse" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900">
            Market data unavailable
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            We encountered an issue while loading prediction markets.
            This does not affect your funds or positions.
          </p>
        </div>

        {/* Dev Info */}
        {process.env.NODE_ENV === "development" && (
          <div className="bg-neutral-100 text-xs p-3 rounded-xl overflow-auto text-neutral-700">
            {error.message}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 pt-2">
          <button
            onClick={reset}
            className="flex-1 rounded-2xl bg-black text-white py-3 text-sm font-medium transition hover:opacity-90"
          >
            Retry
          </button>

          <Link
            href="/dashboard"
            className="flex-1 rounded-2xl border border-neutral-300 py-3 text-center text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition"
          >
            Go to Dashboard
          </Link>
        </div>

        {/* Footer reassurance */}
        <p className="text-xs text-neutral-500 pt-4 border-t">
            PredAI is non-custodial. Your wallet and assets remain secure.
        </p>
      </div>
    </div>
  );
}
