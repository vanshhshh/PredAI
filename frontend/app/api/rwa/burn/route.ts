import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
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

  const assetId = String(body.assetId ?? "").trim();
  const amount = Number(body.amount ?? 0);
  if (!assetId || amount <= 0) {
    return NextResponse.json({ error: "Invalid burn payload" }, { status: 400 });
  }

  const response = await proxyFetch(`${getBackendBaseUrl()}/rwa/burn`, {
    method: "POST",
    headers: forwardAuthHeaders(req),
    body: JSON.stringify({
      asset_id: assetId,
      amount,
    }),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to burn RWA asset") },
      { status: response.status }
    );
  }

  const payload = await safeJson<Record<string, unknown>>(response);
  return NextResponse.json(payload ?? { status: "burned" });
}
