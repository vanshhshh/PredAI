"use client";

import React from "react";

interface RiskGaugeProps {
  risk: number;
}

export function RiskGauge({ risk }: RiskGaugeProps) {
  const clamped = Math.max(0, Math.min(1, risk));
  const percent = Math.round(clamped * 100);

  let label = "Low";
  let color = "#34d399";
  let textColor = "text-emerald-200";

  if (percent >= 67) {
    label = "High";
    color = "#fb7185";
    textColor = "text-rose-200";
  } else if (percent >= 34) {
    label = "Medium";
    color = "#fbbf24";
    textColor = "text-amber-200";
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-slate-950/35"
        role="progressbar"
        aria-label="Portfolio risk score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        style={{
          background: `radial-gradient(circle at center, rgba(2, 6, 23, 0.86) 58%, transparent 59%), conic-gradient(${color} ${percent}%, rgba(148, 163, 184, 0.25) 0)`,
        }}
      >
        <span className="text-xs font-semibold text-slate-100">{percent}%</span>
      </div>

      <div className="text-xs">
        <p className="ui-kicker">Risk</p>
        <p className={`mt-1 font-semibold ${textColor}`}>{label}</p>
      </div>
    </div>
  );
}
