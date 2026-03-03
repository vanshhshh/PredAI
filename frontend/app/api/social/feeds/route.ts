import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../../_utils/backend";

export async function GET(req: NextRequest) {
  const response = await proxyFetch(`${getBackendBaseUrl()}/social/feeds`, {
    method: "GET",
    headers: forwardAuthHeaders(req),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to fetch social feeds") },
      { status: response.status }
    );
  }

  const payload = await safeJson<Record<string, unknown>>(response);
  if (!payload || !Array.isArray(payload.feeds)) {
    return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
  }

  return NextResponse.json({ feeds: payload.feeds });
}
