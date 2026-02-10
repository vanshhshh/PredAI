// File: frontend/lib/utils.ts

/**
 * PURPOSE
 * -------
 * Generic, reusable utility helpers.
 *
 * This module:
 * - contains pure helper functions
 * - avoids domain-specific logic
 * - is safe to use across hooks, components, and pages
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Pure functions only
 * - No side effects
 * - No browser / window assumptions
 * - Deterministic output
 */

/**
 * Safely truncate long identifiers (addresses, hashes)
 */
export function truncateMiddle(
  value: string,
  start = 6,
  end = 4
): string {
  if (!value || value.length <= start + end) {
    return value;
  }

  return `${value.slice(0, start)}…${value.slice(
    -end
  )}`;
}

/**
 * Clamp number between min and max
 */
export function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Format percentage from 0..1 or raw %
 */
export function formatPercent(
  value: number,
  decimals = 2
): string {
  const v = value <= 1 ? value * 100 : value;
  return `${v.toFixed(decimals)}%`;
}

/**
 * Format large numbers for UI
 */
export function formatNumber(
  value: number,
  decimals = 2
): string {
  if (Number.isNaN(value)) return "0";

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Sleep helper (async flows, demos, retries)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
