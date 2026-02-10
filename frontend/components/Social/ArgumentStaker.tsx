// File: frontend/components/Social/ArgumentStaker.tsx

/**
 * PURPOSE
 * -------
 * Interface for staking on reasoning primitives (arguments).
 *
 * This component:
 * - displays AI- and user-generated arguments
 * - allows staking on argument correctness
 * - exposes confidence, backing stake, and resolution state
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No business logic
 * - Deterministic rendering
 * - Explicit risk signaling
 * - Defensive UX (pending, disabled)
 */

"use client";

import React, { useState } from "react";
import { LoadingSpinner } from "../Shared/LoadingSpinner";

interface Argument {
  argumentId: string;
  text: string;
  confidence: number; // 0..1
  totalStake: number;
  resolved: boolean;
}

interface ArgumentStakerProps {
  items: Argument[];
  onStake?: (payload: {
    argumentId: string;
    amount: number;
  }) => Promise<void>;
  isConnected: boolean;
}

export function ArgumentStaker({
  items,
  onStake,
  isConnected,
}: ArgumentStakerProps) {
  if (!items || items.length === 0) {
    return (
      <div className="border rounded-md p-4 text-sm text-gray-600">
        No arguments available.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((arg) => (
        <ArgumentCard
          key={arg.argumentId}
          argument={arg}
          onStake={onStake}
          isConnected={isConnected}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Subcomponents                                                      */
/* ------------------------------------------------------------------ */

function ArgumentCard({
  argument,
  onStake,
  isConnected,
}: {
  argument: Argument;
  onStake?: (payload: {
    argumentId: string;
    amount: number;
  }) => Promise<void>;
  isConnected: boolean;
}) {
  const [amount, setAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className="border rounded-md p-4 space-y-2">
      <div className="text-sm">{argument.text}</div>

      <div className="flex justify-between text-xs text-gray-600">
        <span>
          Confidence: {(argument.confidence * 100).toFixed(0)}%
        </span>
        <span>
          Total Stake: {argument.totalStake.toLocaleString()}
        </span>
      </div>

      {argument.resolved && (
        <div className="text-xs text-green-700">Resolved</div>
      )}

      {!argument.resolved && isConnected && onStake && (
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="flex-1 border rounded-md p-1 text-xs"
            placeholder="Stake amount"
          />
          <button
            onClick={handleStake}
            disabled={isSubmitting || amount <= 0}
            className="px-3 py-1 border rounded-md text-xs"
          >
            Stake
          </button>
        </div>
      )}

      {isSubmitting && <LoadingSpinner label="Staking…" />}
    </div>
  );
}
