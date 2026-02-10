// File: frontend/state/slices/yieldsSlice.ts

/**
 * PURPOSE
 * -------
 * Global yield & portfolio state slice.
 *
 * This slice:
 * - stores yield vaults indexed by vaultId
 * - stores the user portfolio snapshot
 * - exposes pure, synchronous mutations
 *
 * IMPORTANT
 * ---------
 * - No async logic
 * - No calculations here
 * - AI optimization & fetching live in hooks/backend
 */

import { StateCreator } from "zustand";

export interface YieldVaultState {
  vaultId: string;
  name: string;
  description?: string;
  apy: number;
  tvl: number;
  risk: number; // 0..1
}

export interface PortfolioAllocationState {
  vaultId: string;
  currentWeight: number;
  recommendedWeight: number;
  expectedApy: number;
}

export interface YieldPortfolioState {
  totalValue: number;
  risk: number; // 0..1
  allocations: PortfolioAllocationState[];
}

export interface YieldsSlice {
  vaults: Record<string, YieldVaultState>;
  portfolio?: YieldPortfolioState;

  setVaults: (vaults: YieldVaultState[]) => void;
  setPortfolio: (portfolio: YieldPortfolioState) => void;
  updateVault: (vault: YieldVaultState) => void;
}

export const createYieldsSlice: StateCreator<
  YieldsSlice,
  [],
  [],
  YieldsSlice
> = (set) => ({
  vaults: {},
  portfolio: undefined,

  setVaults: (vaults) => {
    const map: Record<string, YieldVaultState> = {};
    for (const v of vaults) {
      map[v.vaultId] = v;
    }
    set({ vaults: map });
  },

  setPortfolio: (portfolio) => {
    set({ portfolio });
  },

  updateVault: (vault) => {
    set((state) => ({
      vaults: {
        ...state.vaults,
        [vault.vaultId]: vault,
      },
    }));
  },
});
