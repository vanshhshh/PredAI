// File: frontend/components/Agent/StakingControls.tsx

/**
 * PURPOSE
 * -------
 * Agent staking & lifecycle controls.
 *
 * This component:
 * - allows users to stake / unstake tokens on an agent
 * - activates or deactivates the agent
 * - enforces minimal client-side validation
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No blockchain calls
 * - Stateless except local form state
 * - Owner / delegate gating enforced by parent
 * - Defensive UX (pending, error, disabled)
 */

"use client";

import React, { useState } from "react";

import { LoadingSpinner } from "../Shared/LoadingSpinner";

interface StakingControlsProps {
  agentId: string;
  currentStake: number;
  active: boolean;
  onStake: (amount: number) => Promise<void>;
  onUnstake: (amount: number) => Promise<void>;
  onToggleActive: () => Promise<void>;
  isPending?: boolean;
  error?: Error | null;
}

export function StakingControls({
  agentId,
  currentStake,
  active,
  onStake,
  onUnstake,
  onToggleActive,
  isPending = false,
  error,
}: StakingControlsProps) {
  const [amount, setAmount] = useState<number>(0);

  // ------------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------------

  async function handleStake() {
    if (amount <= 0) return;
    await onStake(amount);
    setAmount(0);
  }

  async function handleUnstake() {
    if (amount <= 0 || amount > currentStake) return;
    await onUnstake(amount);
    setAmount(0);
  }

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------

  return (
    <div className="border rounded-md p-4 space-y-3">
      <h3 className="font-semibold text-sm">Staking</h3>

      <div className="text-xs text-gray-600">
        Current stake:{" "}
        <strong>{currentStake.toLocaleString()}</strong>
      </div>

      <input
        type="number"
        min={0}
        value={amount}
        onChange={(e) =>
          setAmount(Number(e.target.value))
        }
        className="w-full border rounded-md p-2 text-sm"
        placeholder="Amount"
      />

      <div className="flex gap-2">
        <button
          onClick={handleStake}
          disabled={isPending || amount <= 0}
          className="flex-1 px-3 py-1 border rounded-md text-xs"
        >
          Stake
        </button>
        <button
          onClick={handleUnstake}
          disabled={
            isPending ||
            amount <= 0 ||
            amount > currentStake
          }
          className="flex-1 px-3 py-1 border rounded-md text-xs"
        >
          Unstake
        </button>
      </div>

      <button
        onClick={onToggleActive}
        disabled={isPending}
        className="w-full px-3 py-1 border rounded-md text-xs"
      >
        {active ? "Deactivate Agent" : "Activate Agent"}
      </button>

      {error && (
        <div className="text-xs text-red-600">
          {error.message}
        </div>
      )}

      {isPending && (
        <LoadingSpinner label="Processing…" />
      )}
    </div>
  );
}
