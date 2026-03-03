"use client";

import { useCallback, useEffect, useState } from "react";

import { WalletProvider, normalizeAddress } from "@/lib/identity";
import {
  clearIdentitySession,
  readIdentitySession,
  writeIdentitySession,
} from "@/lib/session";
import { useAppStore } from "@/state/store";

export function useWallet() {
  const address = useAppStore((state) => state.address);
  const username = useAppStore((state) => state.username);
  const walletProvider = useAppStore((state) => state.walletProvider);
  const isConnected = useAppStore((state) => state.isConnected);
  const setWallet = useAppStore((state) => state.setWallet);
  const setUsernameInStore = useAppStore((state) => state.setUsername);
  const resetUser = useAppStore((state) => state.resetUser);

  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const persistSession = useCallback(
    (nextAddress: string, nextProvider: WalletProvider, nextUsername?: string) => {
      writeIdentitySession({
        address: normalizeAddress(nextAddress),
        walletProvider: nextProvider,
        username: nextUsername?.trim() ? nextUsername.trim() : undefined,
      });
    },
    []
  );

  const setExternalWallet = useCallback(
    (nextAddress: string, nextProvider: WalletProvider) => {
      const normalized = normalizeAddress(nextAddress);
      setWallet(normalized, nextProvider);
      persistSession(normalized, nextProvider, username);
      setError(null);
    },
    [persistSession, setWallet, username]
  );

  const setUsername = useCallback(
    (nextUsername?: string) => {
      const normalizedUsername = nextUsername?.trim() ? nextUsername.trim() : undefined;
      setUsernameInStore(normalizedUsername);

      const existing = readIdentitySession();
      if (existing) {
        writeIdentitySession({
          ...existing,
          username: normalizedUsername,
        });
      }
    },
    [setUsernameInStore]
  );

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!(window as any).ethereum) {
        throw new Error("No wallet detected");
      }

      const accounts = await (window as any).ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts returned");
      }

      setExternalWallet(accounts[0], "metamask");
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsConnecting(false);
    }
  }, [setExternalWallet]);

  const disconnect = useCallback(async () => {
    resetUser();
    clearIdentitySession();
    setError(null);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // no-op
    }
  }, [resetUser]);

  useEffect(() => {
    const existing = readIdentitySession();
    if (!existing) return;
    setWallet(existing.address, existing.walletProvider);
    setUsernameInStore(existing.username);
  }, [setUsernameInStore, setWallet]);

  return {
    isConnected,
    address,
    username,
    walletProvider,
    isConnecting,
    error,
    connect,
    disconnect,
    setExternalWallet,
    setUsername,
  };
}
