"use client";

import React, { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

export function LiquidityChart({ liquidity }: LiquidityChartProps) {
  const data = useMemo(() => {
    if (!liquidity?.history?.length) return [];

    return liquidity.history.map((point) => ({
      time: new Date(point.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      liquidity: point.liquidity,
      yesOdds: point.yesOdds * 100,
      noOdds: point.noOdds * 100,
    }));
  }, [liquidity]);

  if (!data.length) {
    return (
      <div className="ui-card-soft rounded-xl p-4 text-sm text-slate-300">
        Liquidity history is not available yet for this market.
      </div>
    );
  }

  return (
    <section className="ui-card p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="ui-kicker">Market Depth</p>
          <h3 className="text-base font-semibold text-white">Liquidity & Odds</h3>
        </div>
        <p className="rounded-lg border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
          Current liquidity: ${liquidity.current.toLocaleString()}
        </p>
      </header>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" vertical={false} />
            <XAxis
              dataKey="time"
              axisLine={{ stroke: "rgba(148, 163, 184, 0.32)" }}
              tickLine={false}
              tick={{ fill: "rgb(148, 163, 184)", fontSize: 11 }}
            />
            <YAxis
              yAxisId="left"
              axisLine={{ stroke: "rgba(148, 163, 184, 0.32)" }}
              tickLine={false}
              tick={{ fill: "rgb(148, 163, 184)", fontSize: 11 }}
              tickFormatter={(value) => `${Math.round(value / 1_000)}k`}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={{ stroke: "rgba(148, 163, 184, 0.32)" }}
              tickLine={false}
              tick={{ fill: "rgb(148, 163, 184)", fontSize: 11 }}
              tickFormatter={(value) => `${Math.round(value)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.96)",
                border: "1px solid rgba(148,163,184,0.3)",
                borderRadius: "12px",
                color: "#dbeafe",
              }}
              labelStyle={{ color: "#a5b4fc" }}
            />
            <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="liquidity"
              stroke="#22d3ee"
              strokeWidth={2.3}
              dot={false}
              name="Liquidity"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="yesOdds"
              stroke="#34d399"
              strokeWidth={2}
              dot={false}
              strokeDasharray="6 3"
              name="YES Odds (%)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="noOdds"
              stroke="#fb7185"
              strokeWidth={2}
              dot={false}
              strokeDasharray="4 3"
              name="NO Odds (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
