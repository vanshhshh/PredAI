// File: frontend/components/Market/MarketCard.tsx

/**
 * PURPOSE
 * -------
 * Compact, production-grade summary card for a prediction market.
 *
 * This component:
 * - displays market title, description, status, odds, liquidity
 * - is used across dashboard, listings, and discovery surfaces
 * - is purely presentational (no data fetching)
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No side effects
 * - No business logic
 * - Defensive rendering (partial data safe)
 * - Click-safe and reusable
 */

"use client";

import React from "react";
import Link from "next/link";

interface MarketCardProps {
  market: {
    marketId: string;
    title: string;
    description?: string;
    yesOdds: number;
    noOdds: number;
    liquidity: number;
    endTime: number;
    settled: boolean;
  };
}

export function MarketCard({ market }: MarketCardProps) {
  const isExpired = Date.now() > market.endTime;

  return (
    <Link
      href={`/markets/${market.marketId}`}
      className="block border rounded-md p-4 hover:shadow-sm transition"
    >
      <div className="space-y-2">
        {/* Title */}
        <h3 className="font-semibold text-base line-clamp-2">
          {market.title}
        </h3>

        {/* Description */}
        {market.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {market.description}
          </p>
        )}

        {/* Odds */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-medium">YES</span>:{" "}
            {(market.yesOdds * 100).toFixed(1)}%
          </div>
          <div>
            <span className="font-medium">NO</span>:{" "}
            {(market.noOdds * 100).toFixed(1)}%
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Liquidity:{" "}
            <strong>{market.liquidity.toLocaleString()}</strong>
          </span>
          <span>
            {market.settled
              ? "Settled"
              : isExpired
              ? "Expired"
              : "Active"}
          </span>
        </div>
      </div>
    </Link>
  );
}
