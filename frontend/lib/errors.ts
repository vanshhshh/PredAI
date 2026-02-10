// File: frontend/lib/errors.ts

/**
 * PURPOSE
 * -------
 * Centralized error definitions for frontend.
 *
 * This module:
 * - defines typed, structured errors
 * - avoids stringly-typed error handling
 * - provides a stable contract between API, hooks, and UI
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Explicit error codes
 * - Human-readable messages
 * - Serializable and log-friendly
 */

export class ApiError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

export function isApiError(
  error: unknown
): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as any).name === "ApiError"
  );
}

export function getErrorMessage(
  error: unknown
): string {
  if (isApiError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred";
}
