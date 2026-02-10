// File: frontend/state/store.ts

/**
 * PURPOSE
 * -------
 * Global application state store.
 *
 * This file:
 * - initializes the global state container
 * - composes domain-specific slices
 * - exposes a single hook for app-wide state access
 *
 * TECH CHOICE
 * -----------
 * - Zustand (lightweight, predictable, production-proven)
 * - No magic middleware
 * - Explicit slice composition
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Domain isolation via slices
 * - No side effects in reducers
 * - Async handled in hooks/services, not here
 */

import { create } from "zustand";

import { createMarketsSlice, MarketsSlice } from "./slices/marketsSlice";
import { createAgentsSlice, AgentsSlice } from "./slices/agentsSlice";
import { createOraclesSlice, OraclesSlice } from "./slices/oraclesSlice";
import { createYieldsSlice, YieldsSlice } from "./slices/yieldsSlice";
import {
  createGovernanceSlice,
  GovernanceSlice,
} from "./slices/governanceSlice";
import { createSocialSlice, SocialSlice } from "./slices/socialSlice";
import { createUserSlice, UserSlice } from "./slices/userSlice";

/**
 * Root state shape
 */
export type AppState = MarketsSlice &
  AgentsSlice &
  OraclesSlice &
  YieldsSlice &
  GovernanceSlice &
  SocialSlice &
  UserSlice;

/**
 * Global store hook
 */
export const useAppStore = create<AppState>()(
  (...args) => ({
    ...createMarketsSlice(...args),
    ...createAgentsSlice(...args),
    ...createOraclesSlice(...args),
    ...createYieldsSlice(...args),
    ...createGovernanceSlice(...args),
    ...createSocialSlice(...args),
    ...createUserSlice(...args),
  })
);
