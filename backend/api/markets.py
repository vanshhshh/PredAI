# File: backend/api/markets.py
"""
PURPOSE
-------
HTTP API surface for prediction markets.

This module:
- exposes read/write endpoints for markets
- performs request validation
- delegates ALL logic to services layer
- never touches blockchain or DB directly

DESIGN RULES (from docs)
------------------------
- Thin controllers
- No business logic here
- Deterministic request/response shapes
- Explicit error handling
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional

from backend.services.market_service import MarketService
from backend.security.auth import get_current_user
from backend.security.invariants import InvariantViolation


router = APIRouter()


# -------------------------------------------------------------------
# SCHEMAS
# -------------------------------------------------------------------

class MarketCreateRequest(BaseModel):
    market_id: str = Field(..., description="Deterministic market identifier")
    start_time: int = Field(..., description="Unix timestamp")
    end_time: int = Field(..., description="Unix timestamp")
    max_exposure: int = Field(..., description="Max exposure in wei")
    metadata_uri: str = Field(..., description="IPFS / Arweave metadata URI")


class MarketResponse(BaseModel):
    market_id: str
    address: str
    start_time: int
    end_time: int
    max_exposure: int
    settled: bool
    final_outcome: Optional[bool]


# -------------------------------------------------------------------
# ENDPOINTS
# -------------------------------------------------------------------

@router.post(
    "/",
    response_model=MarketResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_market(
    req: MarketCreateRequest,
    user=Depends(get_current_user),
):
    """
    Create a new prediction market.

    NOTE:
    -----
    - Requires user authentication
    - Actual on-chain creation is handled by MarketService
    """
    try:
        market = await MarketService.create_market(
            creator=user.address,
            market_id=req.market_id,
            start_time=req.start_time,
            end_time=req.end_time,
            max_exposure=req.max_exposure,
            metadata_uri=req.metadata_uri,
        )
        return market
    except InvariantViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.get(
    "/{market_id}",
    response_model=MarketResponse,
)
async def get_market(market_id: str):
    """
    Fetch a single market by ID.
    """
    market = await MarketService.get_market(market_id)
    if not market:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Market not found",
        )
    return market


@router.get(
    "/",
    response_model=List[MarketResponse],
)
async def list_markets(
    limit: int = 50,
    offset: int = 0,
):
    """
    Paginated list of markets.
    """
    return await MarketService.list_markets(limit=limit, offset=offset)


@router.post(
    "/{market_id}/settle",
    status_code=status.HTTP_200_OK,
)
async def settle_market(
    market_id: str,
    outcome: bool,
    user=Depends(get_current_user),
):
    """
    Trigger settlement for a market.

    NOTE:
    -----
    - Only callable by governance / authorized role
    - Actual settlement is delegated to service layer
    """
    try:
        await MarketService.settle_market(
            market_id=market_id,
            outcome=outcome,
            caller=user.address,
        )
        return {"status": "settled"}
    except InvariantViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )
