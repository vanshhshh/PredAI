import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../../_utils/backend";

type BackendProposal = {
  proposal_id: number;
  title: string;
  description: string;
  start_block: number;
  end_block: number;
  for_votes: number;
  against_votes: number;
  executed: boolean;
  quorum: number;
};

function inferStatus(raw: BackendProposal): "ACTIVE" | "PASSED" | "REJECTED" | "EXECUTED" {
  if (raw.executed) return "EXECUTED";
  const now = Date.now() / 1000;
  if (now < Number(raw.end_block)) return "ACTIVE";
  return Number(raw.for_votes) >= Number(raw.against_votes) ? "PASSED" : "REJECTED";
}

function normalizeProposal(raw: BackendProposal) {
  return {
    proposalId: String(raw.proposal_id),
    title: raw.title,
    description: raw.description,
    status: inferStatus(raw),
    startTime: Number(raw.start_block) * 1000,
    endTime: Number(raw.end_block) * 1000,
    forVotes: Number(raw.for_votes),
    againstVotes: Number(raw.against_votes),
    quorum: Number(raw.quorum),
  };
}

export async function GET(req: NextRequest) {
  const response = await proxyFetch(`${getBackendBaseUrl()}/governance/proposals?limit=200&offset=0`, {
    method: "GET",
    headers: forwardAuthHeaders(req),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to fetch proposals") },
      { status: response.status }
    );
  }

  const payload = await safeJson<unknown>(response);
  const raw = Array.isArray(payload) ? (payload as BackendProposal[]) : [];
  return NextResponse.json({
    proposals: raw.map((item) => normalizeProposal(item)),
  });
}

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

  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const payload =
    body.payload && typeof body.payload === "object"
      ? (body.payload as Record<string, unknown>)
      : {};

  if (!title || !description) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  const response = await proxyFetch(`${getBackendBaseUrl()}/governance/proposals`, {
    method: "POST",
    headers: forwardAuthHeaders(req),
    body: JSON.stringify({
      title,
      description,
      action_target: String(payload.actionTarget ?? "0x0000000000000000000000000000000000000000"),
      action_data: JSON.stringify(payload),
      execution_delay: Number(payload.executionDelay ?? 86_400),
    }),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to create proposal") },
      { status: response.status }
    );
  }

  const created = await safeJson<BackendProposal>(response);
  if (!created) {
    return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
  }

  return NextResponse.json({ proposal: normalizeProposal(created) }, { status: 201 });
}
