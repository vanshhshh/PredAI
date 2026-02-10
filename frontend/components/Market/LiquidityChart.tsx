// File: frontend/components/Market/LiquidityChart.tsx

/**
 * PURPOSE
 * -------
 * Real-time liquidity & odds visualization for a market.
 *
 * This component:
 * - visualizes liquidity depth and odds over time
 * - supports live updates (streamed data passed via props)
 * - degrades gracefully when data is sparse
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Purely presentational
 * - No data fetching or timers
 * - Safe for frequent re-renders
 * - Production-ready chart configuration
 */

"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface LiquidityPoint {
  timestamp: number;
  liquidity: number;
  yesOdds: number;
  noOdds: number;
}

interface LiquidityChartProps {
  marketId: string;
  liquidity: {
    history: LiquidityPoint[];
    current: number;
  };
}

export function LiquidityChart({
  marketId,
  liquidity,
}: LiquidityChartProps) {
  const data = useMemo(() => {
    if (!liquidity?.history || liquidity.history.length === 0) {
      return [];
    }

    return liquidity.history.map((point) => ({
      time: new Date(point.timestamp).toLocaleTimeString(),
      liquidity: point.liquidity,
      yesOdds: point.yesOdds * 100,
      noOdds: point.noOdds * 100,
    }));
  }, [liquidity]);

  if (!data.length) {
    return (
      <div className="border rounded-md p-4 text-sm text-gray-600">
        Liquidity history is not yet available for this market.
      </div>
    );
  }

  return (
    <div className="border rounded-md p-4 space-y-3">
      <h3 className="font-semibold text-sm">
        Liquidity & Odds
      </h3>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="time" />
            <YAxis
              yAxisId="left"
              tickFormatter={(v) => v.toLocaleString()}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip />

            {/* Liquidity */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="liquidity"
              strokeWidth={2}
              dot={false}
            />

            {/* YES Odds */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="yesOdds"
              strokeDasharray="4 2"
              dot={false}
            />

            {/* NO Odds */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="noOdds"
              strokeDasharray="2 2"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
