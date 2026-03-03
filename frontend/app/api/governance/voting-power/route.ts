import { NextRequest, NextResponse } from "next/server";

import { forwardAuthHeaders, getBackendBaseUrl, proxyFetch, safeJson } from "../../_utils/backend";

type UserProfile = {
  reputation_score?: number;
  reputationScore?: number;
  is_governance?: boolean;
  isGovernance?: boolean;
};

export async function GET(req: NextRequest) {
  const response = await proxyFetch(`${getBackendBaseUrl()}/users/me`, {
    method: "GET",
    headers: forwardAuthHeaders(req),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json({ error: "Failed to load user profile" }, { status: response.status });
  }

  const profile = await safeJson<UserProfile>(response);
  if (!profile) {
    return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
  }
  const reputation = Number(profile?.reputationScore ?? profile?.reputation_score ?? 0);
  const isGovernance = Boolean(profile?.isGovernance ?? profile?.is_governance);
  const votingPower = Math.max(1, reputation * (isGovernance ? 20 : 10));
  return NextResponse.json({ votingPower });
}
