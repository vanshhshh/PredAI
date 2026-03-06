"use client";

import React, { useState } from "react";

import { LoadingSpinner } from "../Shared/LoadingSpinner";

interface StakingControlsProps {
  agentId: string;
  currentStake: number;
  active: boolean;
  onStake: (amount: number) => Promise<void>;
  onUnstake: (amount: number) => Promise<void>;
  onDeactivate: () => Promise<void>;
  isPending?: boolean;
  error?: Error | null;
}

export function StakingControls({
  currentStake,
  active,
  onStake,
  onUnstake,
  onDeactivate,
  isPending = false,
  error,
}: StakingControlsProps) {
  const [amountInput, setAmountInput] = useState<string>("");

  const amount = Number(amountInput);
  const hasValidAmount = Number.isFinite(amount) && amount > 0;

  async function handleStake() {
    if (!hasValidAmount) return;
    await onStake(amount);
    setAmountInput("");
  }

  async function handleUnstake() {
    if (!hasValidAmount || amount > currentStake) return;
    await onUnstake(amount);
    setAmountInput("");
  }

  return (
    <section className="ui-card space-y-5 p-5">
      <header>
        <p className="ui-kicker">Capital Controls</p>
        <h3 className="text-base font-semibold text-white">Stake Management</h3>
      </header>

      <div className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 text-sm">
        <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Current Stake</p>
        <p className="mt-1 text-lg font-semibold text-slate-100">
          {currentStake.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
          })}{" "}
          POL
        </p>
      </div>

      <div>
        <label htmlFor="stake-amount" className="ui-label">
          Amount (POL)
        </label>
        <input
          id="stake-amount"
          type="number"
          min={0}
          step="0.0001"
          value={amountInput}
          onChange={(event) => setAmountInput(event.target.value)}
          className="ui-input"
          placeholder="Enter POL amount"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void handleStake()}
          disabled={isPending || !hasValidAmount}
          className="ui-btn ui-btn-primary"
        >
          Stake
        </button>
        <button
          type="button"
          onClick={() => void handleUnstake()}
          disabled={isPending || active || !hasValidAmount || amount > currentStake}
          className="ui-btn ui-btn-secondary"
        >
          Unstake
        </button>
      </div>

      {active && (
        <p className="text-xs text-slate-400">
          Deactivate the agent before unstaking.
        </p>
      )}

      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-slate-500">Lifecycle</p>
          <p className={`mt-1 text-sm font-semibold ${active ? "text-emerald-200" : "text-slate-300"}`}>
            {active ? "Active" : "Inactive"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onDeactivate()}
          disabled={isPending || !active}
          className="ui-btn border border-rose-300/30 bg-rose-400/15 text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {active ? "Deactivate" : "Already Inactive"}
        </button>
      </div>

      {error && <p className="text-sm text-rose-300">{error.message}</p>}
      {isPending && <LoadingSpinner label="Processing transaction..." size="sm" />}
    </section>
  );
}
