"use client";

import React from "react";

import { useWallet } from "../../hooks/useWallet";
import { LoadingSpinner } from "./LoadingSpinner";

export function WalletConnectButton() {
  const { isConnected, address, isConnecting, connect, disconnect, error } =
    useWallet();

  if (isConnecting) {
    return (
      <div className="ui-card-soft px-3 py-2">
        <LoadingSpinner label="Connecting wallet..." size="sm" />
      </div>
    );
  }

  if (isConnected && address) {
    return (
      <div className="ui-card-soft flex items-center gap-2 px-2 py-1.5">
        <span
          className="pulse-dot inline-block h-2 w-2 rounded-full bg-emerald-400"
          aria-hidden="true"
        />
        <span
          className="text-xs font-medium text-slate-100"
          aria-label={`Connected wallet ${address}`}
        >
          {truncate(address)}
        </span>
        <button
          type="button"
          onClick={disconnect}
          className="ui-btn ui-btn-ghost rounded-lg px-2 py-1 text-[11px]"
          aria-label="Disconnect wallet"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={connect}
        className="ui-btn ui-btn-primary"
        aria-label="Connect wallet"
      >
        Connect Wallet
      </button>
      {error && <span className="text-[11px] text-rose-300">{error.message}</span>}
    </div>
  );
}

function truncate(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
