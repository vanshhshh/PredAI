// File: frontend/state/slices/socialSlice.ts

/**
 * PURPOSE
 * -------
 * Global social + signal state slice.
 *
 * This slice:
 * - stores AI-processed social feed items
 * - tracks signal strength and market eligibility
 * - provides pure state updates only
 *
 * IMPORTANT
 * ---------
 * - No polling or API calls
 * - No market creation logic
 * - Backend/hooks handle ingestion & spawning
 */

import { StateCreator } from "zustand";

export interface SocialFeedState {
  id: string;
  source: "X" | "FARCASTER" | "ONCHAIN" | "OTHER";
  author: string;
  content: string;
  timestamp: number;
  signalScore?: number; // 0..1
  marketEligible?: boolean;
}

export interface SocialSlice {
  feeds: Record<string, SocialFeedState>;

  setFeeds: (feeds: SocialFeedState[]) => void;
  updateFeed: (feed: SocialFeedState) => void;
  clearFeeds: () => void;
}

export const createSocialSlice: StateCreator<
  SocialSlice,
  [],
  [],
  SocialSlice
> = (set) => ({
  feeds: {},

  setFeeds: (feeds) => {
    const map: Record<string, SocialFeedState> = {};
    for (const f of feeds) {
      map[f.id] = f;
    }
    set({ feeds: map });
  },

  updateFeed: (feed) => {
    set((state) => ({
      feeds: {
        ...state.feeds,
        [feed.id]: feed,
      },
    }));
  },

  clearFeeds: () => {
    set({ feeds: {} });
  },
});
