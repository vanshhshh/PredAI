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

export interface UserPreferences {
  theme?: "light" | "dark" | "system";
  currency?: string;
}

export interface UserSlice {
  address?: string;
  isConnected: boolean;
  preferences: UserPreferences;

  setWallet: (address?: string) => void;
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
  isConnected: false,
  preferences: {},

  setWallet: (address) => {
    set({
      address,
      isConnected: Boolean(address),
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
      isConnected: false,
      preferences: {},
    });
  },
});
