import { NextRequest, NextResponse } from "next/server";

import {
  forwardAuthHeaders,
  getBackendBaseUrl,
  proxyFetch,
  readErrorText,
  safeJson,
} from "../../_utils/backend";

type BackendPosition = {
  vault_id?: string;
  vaultId?: string;
  amount?: number;
  apy_bps?: number;
  apyBps?: number;
  risk_score?: number;
  riskScore?: number;
};

type BackendPortfolio = {
  total_value?: number;
  totalValue?: number;
  positions?: BackendPosition[];
};

export async function GET(req: NextRequest) {
  const response = await proxyFetch(`${getBackendBaseUrl()}/yield/portfolio`, {
    method: "GET",
    headers: forwardAuthHeaders(req),
  });

  if (!response) {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 503 });
  }
  if (!response.ok) {
    return NextResponse.json(
      { error: await readErrorText(response, "Failed to fetch portfolio") },
      { status: response.status }
    );
  }

  const payload = await safeJson<BackendPortfolio>(response);
  if (!payload?.positions) {
    return NextResponse.json({ error: "Invalid backend response" }, { status: 502 });
  }

  const totalValue = Number(payload.totalValue ?? payload.total_value ?? 0);
  const denominator =
    totalValue > 0
      ? totalValue
      : payload.positions.reduce((sum, position) => sum + Number(position.amount ?? 0), 0);

  const allocations = payload.positions.map((position) => {
    const amount = Number(position.amount ?? 0);
    return {
      vaultId: String(position.vaultId ?? position.vault_id ?? "vault"),
      currentWeight: denominator > 0 ? amount / denominator : 0,
      recommendedWeight: denominator > 0 ? amount / denominator : 0,
      expectedApy: Number(position.apyBps ?? position.apy_bps ?? 0) / 100,
      _riskScore: Number(position.riskScore ?? position.risk_score ?? 0) / 100,
    };
  });

  const risk = allocations.reduce(
    (sum, allocation) => sum + allocation.currentWeight * allocation._riskScore,
    0
  );

  return NextResponse.json({
    totalValue: totalValue || denominator,
    risk,
    allocations: allocations.map(({ _riskScore, ...safe }) => safe),
  });
}
