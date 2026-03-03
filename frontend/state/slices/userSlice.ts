// File: frontend/state/slices/userSlice.ts

/**
 * PURPOSE
 * -------
 * Global user/session state slice.
 *
 * This slice:
 * - tracks wallet connection + address
 * - stores user preferences
 * - provides a single source of truth for user session state
 *
 * IMPORTANT
 * ---------
 * - Wallet connection logic lives in hooks
 * - This slice only reflects derived state
 */

import { StateCreator } from "zustand";

import { WalletProvider } from "@/lib/identity";

export interface UserPreferences {
  theme?: "light" | "dark" | "system";
  currency?: string;
}

export interface UserSlice {
  address?: string;
  username?: string;
  walletProvider?: WalletProvider;
  isConnected: boolean;
  preferences: UserPreferences;

  setWallet: (address?: string, walletProvider?: WalletProvider) => void;
  setUsername: (username?: string) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  resetUser: () => void;
}

export const createUserSlice: StateCreator<
  UserSlice,
  [],
  [],
  UserSlice
> = (set) => ({
  address: undefined,
  username: undefined,
  walletProvider: undefined,
  isConnected: false,
  preferences: {},

  setWallet: (address, walletProvider) => {
    set({
      address,
      walletProvider,
      isConnected: Boolean(address),
    });
  },

  setUsername: (username) => {
    set({
      username: username?.trim() ? username.trim() : undefined,
    });
  },

  setPreferences: (prefs) => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        ...prefs,
      },
    }));
  },

  resetUser: () => {
    set({
      address: undefined,
      username: undefined,
      walletProvider: undefined,
      isConnected: false,
      preferences: {},
    });
  },
});
