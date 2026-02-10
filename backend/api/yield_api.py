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
