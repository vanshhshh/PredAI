"use client";

import React, { useState } from "react";

import { useMarkets } from "../../hooks/useMarkets";
import { useWallet } from "../../hooks/useWallet";
import { LoadingSpinner } from "../Shared/LoadingSpinner";

interface BetFormProps {
  marketId: string;
  yesOdds: number | null;
  noOdds: number | null;
  yesPool: number;
  noPool: number;
  isSettled: boolean;
}

export function BetForm({
  marketId,
  yesOdds,
  noOdds,
  yesPool,
  noPool,
  isSettled,
}: BetFormProps) {
  const { isConnected } = useWallet();
  const { placeBet, isBetting, error } = useMarkets();

  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState<number>(0);

  if (isSettled) {
    return (
      <div className="ui-card-soft rounded-xl p-4 text-sm text-slate-300">
        This market has already settled and no longer accepts new positions.
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="ui-card-soft rounded-xl p-4 text-sm text-slate-300">
        Connect your wallet to place a trade on this market.
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (amount <= 0) return;

    await placeBet({
      marketId,
      side,
      amount,
    });
  }

  const selectedOdds = side === "YES" ? yesOdds : noOdds;
  const payout = estimateParimutuelPayout({
    amount,
    side,
    yesPool,
    noPool,
  });
  const profit = payout === null ? null : payout - amount;

  return (
    <form onSubmit={handleSubmit} className="ui-card space-y-5 p-5">
      <header>
        <p className="ui-kicker">Trade Ticket</p>
        <h3 className="mt-1 text-base font-semibold text-white">Place Position</h3>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <OutcomeButton
          active={side === "YES"}
          label="YES"
          probability={yesOdds}
          color="emerald"
          onClick={() => setSide("YES")}
        />
        <OutcomeButton
          active={side === "NO"}
          label="NO"
          probability={noOdds}
          color="rose"
          onClick={() => setSide("NO")}
        />
      </div>

      <div>
        <label htmlFor={`bet-amount-${marketId}`} className="ui-label">
          Position Size
        </label>
        <input
          id={`bet-amount-${marketId}`}
          type="number"
          min={0}
          step="any"
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          className="ui-input"
          placeholder="0.00"
          aria-label="Bet amount"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {[25, 100, 250].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount(preset)}
            className="ui-btn ui-btn-secondary px-3 py-1.5 text-xs"
          >
            +{preset}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/35 p-3 text-sm">
        <div className="flex items-center justify-between text-slate-300">
          <span>Selected Side</span>
          <span className="font-semibold text-white">{side}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-slate-300">
          <span>Odds</span>
          <span>{selectedOdds === null ? "N/A" : `${(selectedOdds * 100).toFixed(2)}%`}</span>
        </div>
        <div className="mt-2 flex items-center justify-between font-semibold text-cyan-100">
          <span>Estimated Payout*</span>
          <span>{payout === null ? "N/A" : payout.toFixed(4)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-slate-300">
          <span>Estimated Profit*</span>
          <span>{profit === null ? "N/A" : profit.toFixed(4)}</span>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          * Based on current YES/NO pools. Final payout changes as new bets arrive.
        </p>
      </div>

      {error && <p className="text-sm text-rose-300">{error.message}</p>}

      <button
        type="submit"
        disabled={isBetting || amount <= 0}
        className="ui-btn ui-btn-primary w-full"
      >
        {isBetting ? "Submitting trade..." : "Place Bet"}
      </button>

      {isBetting && <LoadingSpinner label="Broadcasting order..." size="sm" />}
    </form>
  );
}

function estimateParimutuelPayout({
  amount,
  side,
  yesPool,
  noPool,
}: {
  amount: number;
  side: "YES" | "NO";
  yesPool: number;
  noPool: number;
}): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const yes = Number.isFinite(yesPool) && yesPool > 0 ? yesPool : 0;
  const no = Number.isFinite(noPool) && noPool > 0 ? noPool : 0;

  const projectedTotalPool = yes + no + amount;
  const projectedWinningPool = side === "YES" ? yes + amount : no + amount;
  if (projectedWinningPool <= 0) return null;

  return (amount * projectedTotalPool) / projectedWinningPool;
}

function OutcomeButton({
  active,
  label,
  probability,
  color,
  onClick,
}: {
  active: boolean;
  label: "YES" | "NO";
  probability: number | null;
  color: "emerald" | "rose";
  onClick: () => void;
}) {
  const activeStyles =
    color === "emerald"
      ? "border-emerald-300/50 bg-emerald-400/15 text-emerald-100"
      : "border-rose-300/50 bg-rose-400/15 text-rose-100";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2 text-sm transition ${
        active
          ? activeStyles
          : "border-white/15 bg-slate-950/25 text-slate-200 hover:border-white/30"
      }`}
      aria-pressed={active}
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-1 text-xs">
        {probability === null ? "N/A" : `${(probability * 100).toFixed(1)}%`}
      </p>
    </button>
  );
}
