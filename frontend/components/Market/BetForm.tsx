// File: frontend/components/Market/BetForm.tsx

/**
 * PURPOSE
 * -------
 * Betting interface for a single prediction market.
 *
 * This component:
 * - allows users to place YES / NO bets
 * - validates inputs client-side
 * - delegates execution to backend / on-chain handlers
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No mock data
 * - No direct blockchain calls
 * - Wallet-aware but not wallet-owning
 * - Defensive UX (pending, error, disabled states)
 */

"use client";

import React, { useState } from "react";

import { useWallet } from "../../hooks/useWallet";
import { useMarkets } from "../../hooks/useMarkets";

import { LoadingSpinner } from "../Shared/LoadingSpinner";

interface BetFormProps {
  marketId: string;
  yesOdds: number;
  noOdds: number;
  isSettled: boolean;
}

export function BetForm({
  marketId,
  yesOdds,
  noOdds,
  isSettled,
}: BetFormProps) {
  const { isConnected } = useWallet();
  const { placeBet, isBetting, error } = useMarkets();

  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState<number>(0);

  // ------------------------------------------------------------------
  // GUARDS
  // ------------------------------------------------------------------

  if (isSettled) {
    return (
      <div className="p-4 border rounded-md bg-gray-50 text-sm">
        This market has been settled.
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-4 border rounded-md bg-gray-50 text-sm">
        Connect your wallet to place a bet.
      </div>
    );
  }

  // ------------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (amount <= 0) return;

    await placeBet({
      marketId,
      side,
      amount,
    });
  }

  const odds = side === "YES" ? yesOdds : noOdds;

  // ------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------

  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-md p-4 space-y-4"
    >
      <h3 className="font-semibold text-sm">Place Bet</h3>

      {/* Side */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSide("YES")}
          className={`flex-1 px-3 py-2 border rounded-md text-sm ${
            side === "YES"
              ? "bg-black text-white"
              : "bg-white"
          }`}
        >
          YES ({(yesOdds * 100).toFixed(1)}%)
        </button>
        <button
          type="button"
          onClick={() => setSide("NO")}
          className={`flex-1 px-3 py-2 border rounded-md text-sm ${
            side === "NO"
              ? "bg-black text-white"
              : "bg-white"
          }`}
        >
          NO ({(noOdds * 100).toFixed(1)}%)
        </button>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium">
          Amount
        </label>
        <input
          type="number"
          min={0}
          step="any"
          value={amount}
          onChange={(e) =>
            setAmount(Number(e.target.value))
          }
          className="mt-1 w-full border rounded-md p-2 text-sm"
        />
      </div>

      {/* Expected Payout */}
      <div className="text-xs text-gray-600">
        Expected payout:{" "}
        <strong>
          {(amount * odds).toFixed(4)}
        </strong>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-red-600">
          {error.message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isBetting || amount <= 0}
        className="w-full px-4 py-2 bg-black text-white rounded-md text-sm"
      >
        {isBetting ? "Placing bet…" : "Place Bet"}
      </button>

      {isBetting && (
        <LoadingSpinner label="Submitting bet…" />
      )}
    </form>
  );
}
