// File: frontend/components/Yield/VaultCard.tsx

/**
 * PURPOSE
 * -------
 * Summary card for a yield vault.
 *
 * This component:
 * - displays vault strategy, APY, TVL, and risk
 * - is used in vault discovery and portfolio views
 * - links to detailed vault inspection
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Purely presentational
 * - No data fetching
 * - Clear financial signaling
 * - Safe for reuse across contexts
 */

"use client";

import React from "react";
import Link from "next/link";

import { RiskGauge } from "./RiskGauge";

interface VaultCardProps {
  vault: {
    vaultId: string;
    name: string;
    description?: string;
    apy: number; // %
    tvl: number;
    risk: number; // 0..1
  };
}

export function VaultCard({ vault }: VaultCardProps) {
  return (
    <Link
      href={`/yield/vaults/${vault.vaultId}`}
      className="block border rounded-md p-4 hover:shadow-sm transition"
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            {vault.name}
          </h3>
          <RiskGauge risk={vault.risk} />
        </div>

        {/* Description */}
        {vault.description && (
          <p className="text-xs text-gray-600 line-clamp-2">
            {vault.description}
          </p>
        )}

        {/* Metrics */}
        <div className="flex justify-between text-xs text-gray-700">
          <span>
            APY:{" "}
            <strong>{vault.apy.toFixed(2)}%</strong>
          </span>
          <span>
            TVL:{" "}
            <strong>
              {vault.tvl.toLocaleString()}
            </strong>
          </span>
        </div>
      </div>
    </Link>
  );
}
