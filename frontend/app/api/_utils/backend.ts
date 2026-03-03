import { NextRequest } from "next/server";

const DEFAULT_TIMEOUT_MS = 10_000;

function isLocalBackendUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes("localhost") ||
    normalized.includes("127.0.0.1") ||
    normalized.includes("http://backend:8000")
  );
}

export function getBackendBaseUrl(): string {
  const candidate =
    process.env.BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BASE_URL;

  const isVercelRuntime = Boolean(process.env.VERCEL);

  if (candidate?.trim()) {
    if (isVercelRuntime && isLocalBackendUrl(candidate)) {
      return "https://predai-backend.onrender.com";
    }
    return candidate;
  }

  if (isVercelRuntime || process.env.NODE_ENV === "production") {
    return "https://predai-backend.onrender.com";
  }

  return "http://backend:8000";
}

export function forwardAuthHeaders(req: NextRequest): Record<string, string> {
  const auth = req.headers.get("authorization");
  const cookie = req.headers.get("cookie");
  const backendToken = req.cookies.get("backend_token")?.value;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    headers.authorization = auth;
  } else if (backendToken) {
    headers.authorization = `Bearer ${backendToken}`;
  }
  if (cookie) {
    headers.cookie = cookie;
  }

  return headers;
}

export async function proxyFetch(
  url: string,
  options: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
    return response;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function readErrorText(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const text = await response.text();
    return text || fallback;
  } catch {
    return fallback;
  }
}

export async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}
