// File: frontend/state/slices/marketsSlice.ts

/**
 * PURPOSE
 * -------
 * Global markets state slice.
 *
 * This slice:
 * - stores normalized market data
 * - tracks selected / active market
 * - provides pure state mutations only
 *
 * IMPORTANT
 * ---------
 * - No async logic here
 * - No API calls
 * - Mutations are deterministic
 *
 * Async fetching happens in hooks/services
 */

import { StateCreator } from "zustand";

export interface MarketState {
  marketId: string;
  title: string;
  description?: string;
  yesOdds: number;
  noOdds: number;
  liquidity: number;
  endTime: number;
  settled: boolean;
}

export interface MarketsSlice {
  markets: Record<string, MarketState>;
  selectedMarketId?: string;

  setMarkets: (markets: MarketState[]) => void;
  selectMarket: (marketId?: string) => void;
  updateMarket: (market: MarketState) => void;
}

export const createMarketsSlice: StateCreator<
  MarketsSlice,
  [],
  [],
  MarketsSlice
> = (set, get) => ({
  markets: {},
  selectedMarketId: undefined,

  setMarkets: (markets) => {
    const map: Record<string, MarketState> = {};
    for (const m of markets) {
      map[m.marketId] = m;
    }

    set({ markets: map });
  },

  selectMarket: (marketId) => {
    set({ selectedMarketId: marketId });
  },

  updateMarket: (market) => {
    set((state) => ({
      markets: {
        ...state.markets,
        [market.marketId]: market,
      },
    }));
  },
});
