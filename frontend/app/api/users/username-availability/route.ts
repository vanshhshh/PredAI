import { NextRequest, NextResponse } from "next/server";

import {
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../../_utils/backend";

type AvailabilityPayload = {
  username: string;
  available: boolean;
};

export async function GET(req: NextRequest) {
  const username = String(req.nextUrl.searchParams.get("username") ?? "").trim();
  const address = String(req.nextUrl.searchParams.get("address") ?? "").trim();

  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const params = new URLSearchParams({ username });
  if (address) {
    params.set("address", address);
  }

  const response = await proxyFetch(
    `${getBackendBaseUrl()}/users/username-availability?${params.toString()}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to check username availability") },
      { status: response.status }
    );
  }

  const payload = await safeJson<AvailabilityPayload>(response);
  if (!payload || typeof payload.available !== "boolean") {
    return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
  }

  return NextResponse.json(payload);
}

