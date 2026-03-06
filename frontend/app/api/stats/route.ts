import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../_utils/backend";

type PlatformStatsResponse = {
  total_markets: number;
  total_wallets: number;
  total_bets: number;
  total_agents: number;
};

export async function GET(req: NextRequest) {
  const response = await proxyFetch(`${getBackendBaseUrl()}/api/stats`, {
    method: "GET",
    headers: forwardAuthHeaders(req),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to fetch stats") },
      { status: response.status }
    );
  }

  const payload = await safeJson<PlatformStatsResponse>(response);
  if (!payload) {
    return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
  }

  return NextResponse.json(payload);
}

