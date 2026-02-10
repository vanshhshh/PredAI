# File: backend/api/oracles.py
"""
PURPOSE
-------
HTTP API surface for oracle participants and oracle-driven actions.

This module:
- exposes oracle registration & status endpoints
- allows authorized oracle submissions
- never performs consensus or slashing directly
- delegates ALL logic to oracle_service

DESIGN RULES (from docs)
------------------------
- No oracle logic in controllers
- No direct blockchain calls
- Explicit authorization
- Deterministic failure modes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List

from backend.services.oracle_service import OracleService
from backend.security.auth import get_current_user
from backend.security.invariants import InvariantViolation


router = APIRouter()


# -------------------------------------------------------------------
# SCHEMAS
# -------------------------------------------------------------------

class OracleRegisterRequest(BaseModel):
    oracle_id: str = Field(..., description="Deterministic oracle identifier")
    metadata_uri: str = Field(..., description="IPFS / Arweave metadata URI")


class OracleResponse(BaseModel):
    oracle_id: str
    address: str
    active: bool
    stake: int
    metadata_uri: str


class OracleSubmissionRequest(BaseModel):
    market_id: str = Field(..., description="Market identifier")
    outcome: bool = Field(..., description="Submitted outcome")


# -------------------------------------------------------------------
# ENDPOINTS
# -------------------------------------------------------------------

@router.post(
    "/register",
    response_model=OracleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_oracle(
    req: OracleRegisterRequest,
    user=Depends(get_current_user),
):
    """
    Register a new oracle identity.
    """
    try:
        return await OracleService.register_oracle(
            oracle_address=user.address,
            oracle_id=req.oracle_id,
            metadata_uri=req.metadata_uri,
        )
    except InvariantViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.get(
    "/{oracle_id}",
    response_model=OracleResponse,
)
async def get_oracle(oracle_id: str):
    """
    Fetch oracle details by oracle_id.
    """
    oracle = await OracleService.get_oracle(oracle_id)
    if not oracle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Oracle not found",
        )
    return oracle


@router.get(
    "/",
    response_model=List[OracleResponse],
)
async def list_oracles(
    limit: int = 50,
    offset: int = 0,
):
    """
    Paginated list of registered oracles.
    """
    return await OracleService.list_oracles(limit=limit, offset=offset)


@router.post(
    "/submit",
    status_code=status.HTTP_200_OK,
)
async def submit_outcome(
    req: OracleSubmissionRequest,
    user=Depends(get_current_user),
):
    """
    Submit an outcome for a market as an oracle.

    NOTE:
    -----
    - Requires oracle registration
    - Weighting, consensus, and slashing are handled downstream
    """
    try:
        await OracleService.submit_outcome(
            oracle_address=user.address,
            market_id=req.market_id,
            outcome=req.outcome,
        )
        return {"status": "submitted"}
    except InvariantViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )
