// File: frontend/app/api/agents/route.ts

import { NextRequest, NextResponse } from "next/server";

/**
 * Resolve backend URL safely.
 * - Never throws at build time
 * - Works in Docker + local
 * - Fails only at request time (correct behavior)
 */
function getBackendBaseUrl(): string {
  return (
    process.env.BACKEND_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    "http://backend:8000" // Docker default
  );
}

export async function GET() {
  const BACKEND_BASE_URL = getBackendBaseUrl();

  const res = await fetch(`${BACKEND_BASE_URL}/agents`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch agents" },
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

  const res = await fetch(`${BACKEND_BASE_URL}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: res.status }
    );
  }

  return NextResponse.json(await res.json());
}
