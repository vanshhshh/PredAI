import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
} from "../../_utils/backend";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const proposalId = String(body.proposalId ?? "").trim();
  const support = String(body.support ?? "").toUpperCase();
  const weight = Number(body.weight ?? 0);

  if (!proposalId || (support !== "FOR" && support !== "AGAINST") || weight <= 0) {
    return NextResponse.json({ error: "Invalid vote payload" }, { status: 400 });
  }

  const response = await proxyFetch(
    `${getBackendBaseUrl()}/governance/proposals/${proposalId}/vote`,
    {
      method: "POST",
      headers: forwardAuthHeaders(req),
      body: JSON.stringify({
        support: support === "FOR",
        weight,
      }),
    }
  );

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Vote rejected") },
      { status: response.status }
    );
  }

  return NextResponse.json({ status: "voted" });
}
