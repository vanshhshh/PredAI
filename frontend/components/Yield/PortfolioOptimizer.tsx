// File: frontend/components/Yield/PortfolioOptimizer.tsx

/**
 * PURPOSE
 * -------
 * AI-driven yield portfolio optimizer UI.
 *
 * This component:
 * - visualizes portfolio allocation recommendations
 * - compares current vs optimized allocation
 * - shows expected APY, risk, and confidence
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - Read-only visualization + user-triggered rebalance
 * - Deterministic rendering
 * - Production-safe for financial UX
 */

"use client";

import React from "react";

import { RiskGauge } from "./RiskGauge";
import { LoadingSpinner } from "../Shared/LoadingSpinner";

interface Allocation {
  vaultId: string;
  name: string;
  currentWeight: number; // 0..1
  recommendedWeight: number; // 0..1
  expectedApy: number; // %
}

interface PortfolioOptimizerProps {
  allocations: Allocation[];
  portfolioRisk: number; // 0..1
  isOptimizing?: boolean;
  onRebalance?: () => Promise<void>;
  error?: Error | null;
}

export function PortfolioOptimizer({
  allocations,
  portfolioRisk,
  isOptimizing = false,
  onRebalance,
  error,
}: PortfolioOptimizerProps) {
  if (!allocations || allocations.length === 0) {
    return (
      <div className="border rounded-md p-4 text-sm text-gray-600">
        No portfolio data available.
      </div>
    );
  }

  return (
    <div className="border rounded-md p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          Portfolio Optimizer
        </h3>
        <RiskGauge risk={portfolioRisk} />
      </header>

      {/* Allocation Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-xs text-gray-600 border-b">
              <th className="text-left py-2">Vault</th>
              <th className="text-right py-2">
                Current %
              </th>
              <th className="text-right py-2">
                Recommended %
              </th>
              <th className="text-right py-2">
                Expected APY
              </th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((a) => (
              <tr
                key={a.vaultId}
                className="border-b last:border-none"
              >
                <td className="py-2">{a.name}</td>
                <td className="py-2 text-right">
                  {(a.currentWeight * 100).toFixed(1)}%
                </td>
                <td className="py-2 text-right font-medium">
                  {(a.recommendedWeight * 100).toFixed(1)}%
                </td>
                <td className="py-2 text-right">
                  {a.expectedApy.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-red-600">
          {error.message}
        </div>
      )}

      {/* Action */}
      {onRebalance && (
        <button
          onClick={onRebalance}
          disabled={isOptimizing}
          className="px-4 py-2 bg-black text-white rounded-md text-sm"
        >
          {isOptimizing
            ? "Rebalancing…"
            : "Apply Recommended Rebalance"}
        </button>
      )}

      {isOptimizing && (
        <LoadingSpinner label="Optimizing portfolio…" />
      )}
    </div>
  );
}
