// File: frontend/components/Shared/WalletConnectButton.tsx

/**
 * PURPOSE
 * -------
 * Wallet connection & status button.
 *
 * This component:
 * - connects / disconnects EVM-compatible wallets
 * - displays connected address & balance summary
 * - acts as the single wallet entrypoint across the app
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No business logic
 * - Delegates wallet ops to hooks
 * - Safe to render anywhere
 * - Production UX (loading, error, truncation)
 */

"use client";

import React from "react";

import { useWallet } from "../../hooks/useWallet";
import { LoadingSpinner } from "./LoadingSpinner";

export function WalletConnectButton() {
  const {
    isConnected,
    address,
    isConnecting,
    connect,
    disconnect,
    error,
  } = useWallet();

  // ------------------------------------------------------------------
  // CONNECTING
  // ------------------------------------------------------------------

  if (isConnecting) {
    return <LoadingSpinner label="Connecting wallet…" />;
  }

  // ------------------------------------------------------------------
  // CONNECTED
  // ------------------------------------------------------------------

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-700">
          {truncate(address)}
        </span>
        <button
          onClick={disconnect}
          className="px-3 py-1 border rounded-md text-xs"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // DISCONNECTED
  // ------------------------------------------------------------------

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={connect}
        className="px-3 py-1 bg-black text-white rounded-md text-xs"
      >
        Connect Wallet
      </button>

      {error && (
        <span className="text-xs text-red-600">
          {error.message}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Utils                                                              */
/* ------------------------------------------------------------------ */

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
