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
    console.error("ErrorBoundary caught an error:", error, info);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <section className="page-container py-14">
          <div
            className="ui-card fade-in-up mx-auto max-w-2xl p-8"
            role="alert"
            aria-live="assertive"
          >
            <p className="ui-kicker text-rose-300">Interface Failure</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              A rendering error was contained safely.
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              This section failed to load. You can retry without refreshing the
              entire application.
            </p>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <pre className="mt-4 overflow-auto rounded-xl border border-rose-400/30 bg-rose-950/40 p-3 text-xs text-rose-200">
                {this.state.error.message}
              </pre>
            )}

            <div className="mt-6">
              <button
                type="button"
                onClick={this.handleReset}
                className="ui-btn ui-btn-primary"
              >
                Retry Render
              </button>
            </div>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
