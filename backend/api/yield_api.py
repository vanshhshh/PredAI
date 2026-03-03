# File: backend/api/yield.py
"""
PURPOSE
-------
HTTP API surface for the protocol yield ecosystem.

This module:
- exposes read/write endpoints for yield routing
- provides portfolio and vault views
- triggers rebalancing actions
- NEVER touches strategy logic directly

DESIGN RULES (from docs)
------------------------
- Controllers are thin
- No direct DB access
- No blockchain calls
- All economic logic lives in services
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List

from backend.services.yield_service import YieldService
from backend.security.auth import get_current_user
from backend.security.invariants import InvariantViolation


router = APIRouter()


# -------------------------------------------------------------------
# SCHEMAS
# -------------------------------------------------------------------

class VaultResponse(BaseModel):
    vault_id: str
    strategy: str
    total_deposited: int
    apy_bps: int
    risk_score: int
    active: bool


class PortfolioPosition(BaseModel):
    vault_id: str
    amount: int
    apy_bps: int
    risk_score: int


class PortfolioResponse(BaseModel):
    total_value: int
    positions: List[PortfolioPosition]


class RebalanceRequest(BaseModel):
    target_risk_score: int = Field(..., description="Desired portfolio risk score")


# -------------------------------------------------------------------
# ENDPOINTS
# -------------------------------------------------------------------

@router.get(
    "/vaults",
    response_model=List[VaultResponse],
)
async def list_vaults():
    """
    List all available yield vaults.
    """
    return await YieldService.list_vaults()


@router.get(
    "/portfolio",
    response_model=PortfolioResponse,
)
async def get_portfolio(user=Depends(get_current_user)):
    """
    Fetch the authenticated user's yield portfolio.
    """
    return await YieldService.get_portfolio(user.address)


@router.post(
    "/rebalance",
    status_code=status.HTTP_200_OK,
)
async def rebalance_portfolio(
    req: RebalanceRequest,
    user=Depends(get_current_user),
):
    """
    Trigger AI-assisted portfolio rebalancing.

    NOTE:
    -----
    - Rebalancing suggestions are computed off-chain
    - Execution respects RiskAllocator constraints
    """
    try:
        await YieldService.rebalance(
            user_address=user.address,
            target_risk_score=req.target_risk_score,
        )
        return {"status": "rebalanced"}
    except InvariantViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.get("/arbitrage")
async def list_arbitrage():
    """
    Surface current yield arbitrage opportunities derived from live vault data.
    """
    vaults = await YieldService.list_vaults()
    if len(vaults) < 2:
        return []

    ranked = sorted(vaults, key=lambda v: int(v.apy_bps), reverse=True)
    opportunities = []
    now_ms = int(__import__("time").time() * 1000)

    for i in range(min(5, len(ranked) - 1)):
        high = ranked[i]
        low = ranked[-(i + 1)]
        spread_bps = int(high.apy_bps) - int(low.apy_bps)
        if spread_bps <= 0:
            continue

        opportunities.append(
            {
                "opportunityId": f"{high.vault_id}:{low.vault_id}",
                "route": [low.vault_id, high.vault_id],
                "spread": round(spread_bps / 100, 4),
                "confidence": round(min(0.95, 0.55 + spread_bps / 10_000), 4),
                "status": "ACTIVE",
                "detectedAt": now_ms,
            }
        )

    return opportunities
