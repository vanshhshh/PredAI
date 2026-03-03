import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
} from "../../_utils/backend";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object") {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  const targetRiskScore = Number(body.targetRiskScore ?? body.target_risk_score ?? 50);

  const response = await proxyFetch(`${getBackendBaseUrl()}/yield/rebalance`, {
    method: "POST",
    headers: forwardAuthHeaders(req),
    body: JSON.stringify({
      target_risk_score: Math.max(1, targetRiskScore),
    }),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to rebalance portfolio") },
      { status: response.status }
    );
  }
  return NextResponse.json({ status: "rebalanced" });
}
