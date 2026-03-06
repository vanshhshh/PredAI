import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../../../../_utils/backend";

type RouteContext = {
  params: {
    argumentId: string;
  };
};

export async function POST(req: NextRequest, context: RouteContext) {
  const argumentId = context.params.argumentId?.trim();
  if (!argumentId) {
    return NextResponse.json({ error: "argumentId is required" }, { status: 400 });
  }

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

  const response = await proxyFetch(
    `${getBackendBaseUrl()}/social/arguments/${encodeURIComponent(argumentId)}/stake`,
    {
      method: "POST",
      headers: forwardAuthHeaders(req),
      body: JSON.stringify(body),
    }
  );

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Stake failed") },
      { status: response.status }
    );
  }

  const payload = await safeJson<Record<string, unknown>>(response);
  return NextResponse.json(payload ?? { status: "staked" });
}

