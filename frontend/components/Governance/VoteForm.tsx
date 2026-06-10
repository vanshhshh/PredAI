"use client";

import React, { useState } from "react";

import { LoadingSpinner } from "../Shared/LoadingSpinner";

interface VoteFormProps {
  proposalId: string;
  votingPower: number;
  onVote: (payload: { support: "FOR" | "AGAINST" }) => Promise<void>;
  isSubmitting?: boolean;
  error?: Error | null;
}

export function VoteForm({
  votingPower,
  onVote,
  isSubmitting = false,
  error,
}: VoteFormProps) {
  const [support, setSupport] = useState<"FOR" | "AGAINST">("FOR");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (votingPower <= 0) return;

    await onVote({
      support,
    });
  }

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

      <div className="rounded-xl border border-white/10 bg-slate-950/35 p-3">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>Snapshot power</span>
          <span>{votingPower.toLocaleString()}</span>
        </div>
      </div>

      {error && <p className="text-sm text-rose-300">{error.message}</p>}

      <button
        type="submit"
        disabled={isSubmitting || votingPower <= 0}
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
