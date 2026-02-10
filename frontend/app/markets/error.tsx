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

"use client";

import React from "react";

interface MarketsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MarketsError({ error, reset }: MarketsErrorProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="max-w-md w-full border rounded-md p-6 bg-red-50">
        <h2 className="text-lg font-semibold text-red-700">
          Something went wrong
        </h2>

        <p className="mt-2 text-sm text-red-600">
          An unexpected error occurred while loading markets.
        </p>

        {process.env.NODE_ENV === "development" && (
          <pre className="mt-4 text-xs bg-red-100 p-2 rounded overflow-auto">
            {error.message}
          </pre>
        )}

        <button
          onClick={reset}
          className="mt-4 inline-flex items-center px-4 py-2 border rounded-md text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
