// File: frontend/components/Shared/ErrorBoundary.tsx

/**
 * PURPOSE
 * -------
 * Global-safe React error boundary.
 *
 * This component:
 * - catches rendering/runtime errors in child trees
 * - prevents full-app crashes
 * - provides a minimal, user-safe fallback UI
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - No side effects
 * - No logging assumptions (hooks injected later if needed)
 * - Production-safe fallback
 */

"use client";

import React from "react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Intentionally minimal.
    // Hook Sentry / OpenTelemetry here in production infra.
    console.error("UI ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 border rounded-md bg-red-50 text-sm text-red-700">
          <h3 className="font-semibold mb-1">
            Something went wrong
          </h3>
          <p>
            An unexpected error occurred while rendering this
            section.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
