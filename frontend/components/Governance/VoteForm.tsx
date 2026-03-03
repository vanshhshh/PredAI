"use client";

import React, { useState } from "react";

import { LoadingSpinner } from "../Shared/LoadingSpinner";

interface VoteFormProps {
  proposalId: string;
  votingPower: number;
  onVote: (payload: { support: "FOR" | "AGAINST"; weight: number }) => Promise<void>;
  isSubmitting?: boolean;
  error?: Error | null;
}

export function VoteForm({
  proposalId,
  votingPower,
  onVote,
  isSubmitting = false,
  error,
}: VoteFormProps) {
  const [support, setSupport] = useState<"FOR" | "AGAINST">("FOR");
  const [weight, setWeight] = useState<number>(0);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (weight <= 0 || weight > votingPower) return;

    await onVote({
      support,
      weight,
    });
  }

  const powerUsed = votingPower > 0 ? Math.min(100, (weight / votingPower) * 100) : 0;

  return (
    <form onSubmit={handleSubmit} className="ui-card space-y-5 p-5" aria-label="Vote form">
      <header>
        <p className="ui-kicker">Governance Vote</p>
        <h3 className="text-base font-semibold text-white">Cast Ballot</h3>
        <p className="mt-1 text-xs text-slate-300">
          Voting power available: {votingPower.toLocaleString()}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <SupportButton
          active={support === "FOR"}
          label="FOR"
          tone="positive"
          onClick={() => setSupport("FOR")}
        />
        <SupportButton
          active={support === "AGAINST"}
          label="AGAINST"
          tone="negative"
          onClick={() => setSupport("AGAINST")}
        />
      </div>

      <div>
        <label htmlFor={`vote-weight-${proposalId}`} className="ui-label">
          Vote Weight
        </label>
        <input
          id={`vote-weight-${proposalId}`}
          type="number"
          min={0}
          max={votingPower}
          value={weight}
          onChange={(event) => setWeight(Number(event.target.value))}
          className="ui-input"
          aria-label="Vote weight"
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-950/35 p-3">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>Voting Power Used</span>
          <span>{powerUsed.toFixed(1)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950/45">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
            style={{ width: `${powerUsed}%` }}
          />
        </div>
      </div>

      {error && <p className="text-sm text-rose-300">{error.message}</p>}

      <button
        type="submit"
        disabled={isSubmitting || weight <= 0 || weight > votingPower}
        className="ui-btn ui-btn-primary w-full"
      >
        {isSubmitting ? "Submitting vote..." : "Submit Vote"}
      </button>

      {isSubmitting && <LoadingSpinner label="Submitting vote..." size="sm" />}
    </form>
  );
}

function SupportButton({
  active,
  label,
  tone,
  onClick,
}: {
  active: boolean;
  label: "FOR" | "AGAINST";
  tone: "positive" | "negative";
  onClick: () => void;
}) {
  const activeStyle =
    tone === "positive"
      ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
      : "border-rose-300/40 bg-rose-400/15 text-rose-100";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
        active
          ? activeStyle
          : "border-white/15 bg-slate-950/25 text-slate-200 hover:border-white/30"
      }`}
    >
      {label}
    </button>
  );
}
