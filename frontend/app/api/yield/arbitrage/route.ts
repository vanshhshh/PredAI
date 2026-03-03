import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../../_utils/backend";

export async function GET(req: NextRequest) {
  const response = await proxyFetch(`${getBackendBaseUrl()}/yield/arbitrage`, {
    method: "GET",
    headers: forwardAuthHeaders(req),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to fetch arbitrage feed") },
      { status: response.status }
    );
  }

  const payload = await safeJson<unknown>(response);
  if (!Array.isArray(payload)) {
    return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
  }
  return NextResponse.json(payload);
}
