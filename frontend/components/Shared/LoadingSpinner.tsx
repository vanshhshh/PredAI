"use client";

import React from "react";

interface LoadingSpinnerProps {
  label?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_STYLES: Record<NonNullable<LoadingSpinnerProps["size"]>, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-7 w-7 border-[3px]",
};

export function LoadingSpinner({ label, size = "md" }: LoadingSpinnerProps) {
  return (
    <div
      className="inline-flex items-center gap-2 text-sm text-slate-300"
      role="status"
      aria-live="polite"
      aria-label={label ?? "Loading"}
    >
      <span
        className={`inline-block animate-spin rounded-full border-cyan-400 border-t-transparent ${SIZE_STYLES[size]}`}
      />
      {label && <span>{label}</span>}
    </div>
  );
}
