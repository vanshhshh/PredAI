// File: frontend/components/Shared/LoadingSpinner.tsx

/**
 * PURPOSE
 * -------
 * Global loading indicator.
 *
 * This component:
 * - provides a consistent loading UI across the app
 * - supports optional labels
 * - is safe to render inline or as a block
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Stateless
 * - Accessible
 * - Minimal and reusable
 */

"use client";

import React from "react";

interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({
  label,
}: LoadingSpinnerProps) {
  return (
    <div
      className="flex items-center gap-2 text-xs text-gray-600"
      role="status"
      aria-live="polite"
    >
      <svg
        className="animate-spin h-4 w-4 text-gray-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>

      {label && <span>{label}</span>}
    </div>
  );
}
