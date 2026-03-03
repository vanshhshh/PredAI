import { NextRequest, NextResponse } from "next/server";

import {
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../../_utils/backend";

export async function POST(req: NextRequest) {
  let body: { address?: string; chainId?: number; origin?: string };
  try {
    body = (await req.json()) as { address?: string; chainId?: number; origin?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const address = String(body.address ?? "").trim();
  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  const response = await proxyFetch(`${getBackendBaseUrl()}/auth/challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address,
      chain_id: body.chainId,
      origin: body.origin,
    }),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to create challenge") },
      { status: response.status }
    );
  }

  const payload = await safeJson<Record<string, unknown>>(response);
  if (!payload) {
    return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
  }
  return NextResponse.json(payload);
}
