import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../../_utils/backend";

type UserProfile = {
  address: string;
  username: string | null;
  created_at: number;
  reputation_score: number;
  is_governance: boolean;
};

export async function POST(req: NextRequest) {
  let body: { username?: string };
  try {
    body = (await req.json()) as { username?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username = String(body.username ?? "").trim();
  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const response = await proxyFetch(`${getBackendBaseUrl()}/users/me`, {
    method: "POST",
    headers: forwardAuthHeaders(req),
    body: JSON.stringify({ username }),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to update user profile") },
      { status: response.status }
    );
  }

  const payload = await safeJson<UserProfile>(response);
  if (!payload?.address) {
    return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
  }

  return NextResponse.json(payload);
}

