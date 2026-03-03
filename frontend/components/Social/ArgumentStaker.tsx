"use client";

import React, { useState } from "react";

import { LoadingSpinner } from "../Shared/LoadingSpinner";

interface Argument {
  argumentId: string;
  text: string;
  confidence: number;
  totalStake: number;
  resolved: boolean;
}

interface ArgumentStakerProps {
  items: Argument[];
  onStake?: (payload: { argumentId: string; amount: number }) => Promise<void>;
  isConnected: boolean;
}

export function ArgumentStaker({ items, onStake, isConnected }: ArgumentStakerProps) {
  if (!items?.length) {
    return (
      <div className="ui-card-soft rounded-xl p-4 text-sm text-slate-300">
        No stakeable arguments are currently available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((argument) => (
        <ArgumentCard
          key={argument.argumentId}
          argument={argument}
          onStake={onStake}
          isConnected={isConnected}
        />
      ))}
    </div>
  );
}

function ArgumentCard({
  argument,
  onStake,
  isConnected,
}: {
  argument: Argument;
  onStake?: (payload: { argumentId: string; amount: number }) => Promise<void>;
  isConnected: boolean;
}) {
  const [amount, setAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confidencePercent = Math.round(argument.confidence * 100);

  async function handleStake() {
    if (!onStake || amount <= 0) return;

    try {
      setIsSubmitting(true);
      await onStake({
        argumentId: argument.argumentId,
        amount,
      });
      setAmount(0);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <article className="ui-card rounded-xl p-4">
      <p className="text-sm leading-relaxed text-slate-100">{argument.text}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <span>Confidence: {confidencePercent}%</span>
        <span>Total stake: {argument.totalStake.toLocaleString()}</span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-950/45">
        <div
          className={`h-full rounded-full ${
            confidencePercent >= 70
              ? "bg-emerald-400"
              : confidencePercent >= 50
              ? "bg-amber-300"
              : "bg-rose-400"
          }`}
          style={{ width: `${confidencePercent}%` }}
        />
      </div>

      {argument.resolved && (
        <p className="mt-3 inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/15 px-2 py-1 text-xs font-semibold text-emerald-100">
          Resolved
        </p>
      )}

      {!argument.resolved && isConnected && onStake && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="ui-input"
            placeholder="Stake amount"
            aria-label="Stake amount"
          />
          <button
            type="button"
            onClick={() => void handleStake()}
            disabled={isSubmitting || amount <= 0}
            className="ui-btn ui-btn-primary sm:min-w-[110px]"
          >
            Stake
          </button>
        </div>
      )}

      {!isConnected && !argument.resolved && (
        <p className="mt-3 text-xs text-slate-400">Connect a wallet to stake on this argument.</p>
      )}

      {isSubmitting && <LoadingSpinner label="Submitting stake..." size="sm" />}
    </article>
  );
}
