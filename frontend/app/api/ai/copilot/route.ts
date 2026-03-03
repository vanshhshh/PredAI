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

  const response = await proxyFetch(`${getBackendBaseUrl()}/ai/copilot`, {
    method: "POST",
    headers: forwardAuthHeaders(req),
    body: JSON.stringify(body),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Copilot request failed") },
      { status: response.status }
    );
  }

  const payload = await safeJson<Record<string, unknown>>(response);
  if (!payload || typeof payload.reply !== "string") {
    return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });
  }

  return NextResponse.json({ reply: payload.reply });
}
