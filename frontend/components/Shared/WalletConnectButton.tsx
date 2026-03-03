"use client";

import Link from "next/link";
import React from "react";

import { formatIdentity } from "@/lib/identity";
import { useWallet } from "../../hooks/useWallet";

export function WalletConnectButton() {
  const { isConnected, address, username, disconnect } =
    useWallet();

  if (isConnected && address) {
    const identity = formatIdentity(address, username);
    return (
      <div className="ui-card-soft flex items-center gap-2 px-2 py-1.5">
        <span
          className="pulse-dot inline-block h-2 w-2 rounded-full bg-emerald-400"
          aria-hidden="true"
        />
        <span
          className="text-xs font-medium text-slate-100"
          aria-label={`Connected wallet ${identity}`}
        >
          {identity}
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
    <div className="flex items-end">
      <Link href="/sign-in" className="ui-btn ui-btn-primary" aria-label="Connect wallet">
        Connect Wallet
      </Link>
    </div>
  );
}
