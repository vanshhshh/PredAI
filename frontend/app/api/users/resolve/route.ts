import { NextRequest, NextResponse } from "next/server";

import {
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../../_utils/backend";

type ResolvePayload = {
  usernames: Record<string, string>;
};

export async function POST(req: NextRequest) {
  let body: { addresses?: string[] };
  try {
    body = (await req.json()) as { addresses?: string[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const addresses = Array.isArray(body.addresses)
    ? body.addresses.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const response = await proxyFetch(`${getBackendBaseUrl()}/users/resolve-usernames`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ addresses }),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to resolve usernames") },
      { status: response.status }
    );
  }

  const payload = await safeJson<ResolvePayload>(response);
  if (!payload?.usernames || typeof payload.usernames !== "object") {
    return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
  }

  return NextResponse.json(payload);
}

