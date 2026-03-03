import { NextRequest, NextResponse } from "next/server";

import {
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../../_utils/backend";

export async function POST(req: NextRequest) {
  let body: {
    address?: string;
    signature?: string;
    message?: string;
    challengeToken?: string;
  };
  try {
    body = (await req.json()) as {
      address?: string;
      signature?: string;
      message?: string;
      challengeToken?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const address = String(body.address ?? "").trim();
  const signature = String(body.signature ?? "").trim();
  const message = String(body.message ?? "").trim();
  const challengeToken = String(body.challengeToken ?? "").trim();

  if (!address || !signature || !message || !challengeToken) {
    return NextResponse.json({ error: "Missing wallet verification payload" }, { status: 400 });
  }

  const response = await proxyFetch(`${getBackendBaseUrl()}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address,
      signature,
      message,
      challenge_token: challengeToken,
    }),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to verify wallet") },
      { status: response.status }
    );
  }

  const payload = await safeJson<{ access_token?: string; token_type?: string }>(response);
  if (!payload?.access_token) {
    return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("backend_token", payload.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
