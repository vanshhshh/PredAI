"""
RWA endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from backend.persistence.repositories.rwa_repo import RWARepository
from backend.security.auth import get_current_user
from backend.security.invariants import InvariantViolation
from backend.services.rwa_service import RWAService


router = APIRouter()


class RegisterRWARequest(BaseModel):
    rwa_id: str
    token_address: str
    metadata_uri: str
    max_supply: int = Field(..., ge=0)


class MintBurnRequest(BaseModel):
    asset_id: str
    amount: int = Field(..., gt=0)


def _asset_payload(asset):
    return {
        "rwa_id": asset.rwa_id,
        "token_address": asset.token_address,
        "metadata_uri": asset.metadata_uri,
        "max_supply": int(asset.max_supply),
        "current_supply": int(asset.current_supply),
        "creator": asset.creator,
    }


@router.get("/assets")
async def list_assets():
    assets = await RWARepository.list_all()
    return {"assets": [_asset_payload(asset) for asset in assets]}


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_rwa(req: RegisterRWARequest, user=Depends(get_current_user)):
    try:
        asset = await RWAService.register_rwa(
            rwa_id=req.rwa_id,
            token_address=req.token_address,
            metadata_uri=req.metadata_uri,
            max_supply=req.max_supply,
            creator=user.address,
        )
        return {"asset": _asset_payload(asset)}
    except InvariantViolation as exc:
        raise HTTPException(status_code=400, detail=exc.message)


@router.post("/mint")
async def mint_rwa(req: MintBurnRequest, user=Depends(get_current_user)):
    try:
        asset = await RWARepository.mint(
            rwa_id=req.asset_id,
            amount=req.amount,
        )
        return {"asset": _asset_payload(asset)}
    except InvariantViolation as exc:
        raise HTTPException(status_code=400, detail=exc.message)


@router.post("/burn")
async def burn_rwa(req: MintBurnRequest, user=Depends(get_current_user)):
    try:
        asset = await RWARepository.burn(
            rwa_id=req.asset_id,
            amount=req.amount,
        )
        return {"asset": _asset_payload(asset)}
    except InvariantViolation as exc:
        raise HTTPException(status_code=400, detail=exc.message)
