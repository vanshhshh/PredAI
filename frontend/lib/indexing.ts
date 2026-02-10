// File: frontend/lib/indexing.ts

/**
 * PURPOSE
 * -------
 * Frontend-side indexing helpers.
 *
 * This module:
 * - normalizes backend-indexed entities for UI usage
 * - provides stable selectors and lookup maps
 * - avoids recomputation across components
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Pure functions only
 * - No side effects
 * - Deterministic transformations
 * - UI-oriented (NOT blockchain indexing)
 */

export interface Identifiable {
  id: string;
}

/**
 * Convert array → map keyed by `id`
 */
export function indexById<T extends Identifiable>(
  items: T[]
): Record<string, T> {
  const map: Record<string, T> = {};
  for (const item of items) {
    map[item.id] = item;
  }
  return map;
}

/**
 * Group items by arbitrary key
 */
export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

/**
 * Sort helper (immutable)
 */
export function sortBy<T>(
  items: T[],
  compare: (a: T, b: T) => number
): T[] {
  return [...items].sort(compare);
}
