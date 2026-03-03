import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../../_utils/backend";

export async function GET(req: NextRequest) {
  const marketId = req.nextUrl.searchParams.get("marketId");
  if (!marketId) {
    return NextResponse.json({ error: "marketId is required" }, { status: 400 });
  }

  const response = await proxyFetch(
    `${getBackendBaseUrl()}/oracles/status?market_id=${encodeURIComponent(marketId)}`,
    {
      method: "GET",
      headers: forwardAuthHeaders(req),
    }
  );

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to fetch oracle status") },
      { status: response.status }
    );
  }

  const payload = await safeJson<Record<string, unknown>>(response);
  if (!payload) {
    return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
  }
  return NextResponse.json(payload);
}
