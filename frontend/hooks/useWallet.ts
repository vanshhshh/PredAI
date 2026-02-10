// File: frontend/hooks/useWallet.ts

/**
 * PURPOSE
 * -------
 * Wallet connection & session hook.
 *
 * This hook:
 * - manages EVM wallet connection lifecycle
 * - exposes address, connection state, and errors
 * - abstracts wagmi / viem specifics from UI
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Single source of truth for wallet state
 * - No UI logic
 * - Safe defaults when wallet is unavailable
 * - Easily swappable backend (EVM → Solana later)
 */

"use client";

import { useCallback, useEffect, useState } from "react";

export interface WalletState {
  isConnected: boolean;
  address?: string;
}

export function useWallet() {
  const [isConnected, setIsConnected] =
    useState<boolean>(false);
  const [address, setAddress] = useState<string | undefined>(
    undefined
  );
  const [isConnecting, setIsConnecting] =
    useState<boolean>(false);
  const [error, setError] = useState<Error | null>(
    null
  );

  // ------------------------------------------------------------------
  // CONNECT
  // ------------------------------------------------------------------

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!(window as any).ethereum) {
        throw new Error("No wallet detected");
      }

      const accounts = await (
        window as any
      ).ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned");
      }

      setAddress(accounts[0]);
      setIsConnected(true);
    } catch (err) {
      setError(err as Error);
      setIsConnected(false);
      setAddress(undefined);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // DISCONNECT
  // ------------------------------------------------------------------

  const disconnect = useCallback(() => {
    // EVM wallets don't truly disconnect;
    // this clears local session state.
    setIsConnected(false);
    setAddress(undefined);
  }, []);

  // ------------------------------------------------------------------
  // AUTO-RECONNECT
  // ------------------------------------------------------------------

  useEffect(() => {
    async function autoConnect() {
      try {
        if (!(window as any).ethereum) return;

        const accounts = await (
          window as any
        ).ethereum.request({
          method: "eth_accounts",
        });

        if (accounts && accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
        }
      } catch {
        // silent
      }
    }

    autoConnect();
  }, []);

  // ------------------------------------------------------------------
  // PUBLIC API
  // ------------------------------------------------------------------

  return {
    isConnected,
    address,
    isConnecting,
    error,

    connect,
    disconnect,
  };
}
