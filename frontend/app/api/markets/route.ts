// File: frontend/app/api/markets/route.ts

import { NextRequest, NextResponse } from "next/server";

/**
 * Resolve backend URL safely.
 * - Works in Docker build
 * - Works in runtime
 * - Never throws at module scope
 */
function getBackendBaseUrl(): string {
  return (
    process.env.BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    "http://backend:8000" // safe Docker default
  );
}

export async function GET(req: NextRequest) {
  const BACKEND_BASE_URL = getBackendBaseUrl();

  const { searchParams } = new URL(req.url);

  const limit = searchParams.get("limit");
  const page = searchParams.get("page");
  const query = searchParams.get("query");

  const backendUrl = new URL("/markets", BACKEND_BASE_URL);

  if (limit) backendUrl.searchParams.set("limit", limit);
  if (page) backendUrl.searchParams.set("page", page);
  if (query) backendUrl.searchParams.set("query", query);

  const res = await fetch(backendUrl.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch markets" },
      { status: res.status }
    );
  }

  return NextResponse.json(await res.json());
}

export async function POST(req: NextRequest) {
  const BACKEND_BASE_URL = getBackendBaseUrl();
  const body = await req.json();

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const res = await fetch(`${BACKEND_BASE_URL}/markets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to create market" },
      { status: res.status }
    );
  }

  return NextResponse.json(await res.json());
}
