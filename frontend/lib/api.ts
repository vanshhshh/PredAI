// File: frontend/lib/api.ts

/**
 * PURPOSE
 * -------
 * Centralized API client for frontend → backend communication.
 *
 * This module:
 * - standardizes HTTP requests (GET / POST)
 * - enforces consistent error handling
 * - applies auth headers when needed
 * - avoids duplication across hooks
 *
 * DESIGN PRINCIPLES
 * -----------------
 * - Thin abstraction (not a framework)
 * - Deterministic behavior
 * - Explicit request/response typing
 * - Production-safe defaults
 */

"use client";

import { ApiError } from "./errors";

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

const DEFAULT_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
};

async function getAuthHeader(): Promise<
  Record<string, string>
> {
  // NOTE:
  // Wallet-based auth / JWT injection
  // will be wired here later.
  // For now this is a no-op placeholder.
  return {};
}

/**
 * Core request primitive
 */
export async function apiRequest<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    headers = {},
    body,
    auth = true,
    signal,
  } = options;

  const finalHeaders: Record<string, string> = {
    ...DEFAULT_HEADERS,
    ...headers,
  };

  if (auth) {
    const authHeader = await getAuthHeader();
    Object.assign(finalHeaders, authHeader);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal,
      cache: "no-store",
    });
  } catch (err) {
    throw new ApiError(
      "NETWORK_ERROR",
      "Network request failed"
    );
  }

  if (!response.ok) {
    let message = "API request failed";

    try {
      const text = await response.text();
      if (text) message = text;
    } catch {
      /* ignore */
    }

    throw new ApiError(
      response.status.toString(),
      message
    );
  }

  // Empty response
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(
      "INVALID_JSON",
      "Invalid JSON response"
    );
  }
}

/**
 * Convenience helpers
 */
export const api = {
  get<T>(url: string, auth = true) {
    return apiRequest<T>(url, {
      method: "GET",
      auth,
    });
  },

  post<T>(
    url: string,
    body?: unknown,
    auth = true
  ) {
    return apiRequest<T>(url, {
      method: "POST",
      body,
      auth,
    });
  },
};
