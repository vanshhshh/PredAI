"""
Wallet authentication endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.security.auth import (
    authenticate_wallet,
    create_wallet_challenge,
)
from backend.security.invariants import InvariantViolation


router = APIRouter()


class WalletChallengeRequest(BaseModel):
    address: str = Field(..., description="Wallet address")
    chain_id: int | None = Field(default=None, description="Requested chain id")
    origin: str | None = Field(default=None, description="Frontend origin")


class WalletChallengeResponse(BaseModel):
    message: str
    challenge_token: str
    expires_at: int


class WalletVerifyRequest(BaseModel):
    address: str = Field(..., description="Wallet address")
    signature: str = Field(..., description="Signed challenge message")
    message: str = Field(..., description="Exact challenge message signed")
    challenge_token: str = Field(..., description="Challenge JWT from /auth/challenge")


class WalletVerifyResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"


@router.post(
    "/challenge",
    response_model=WalletChallengeResponse,
    status_code=status.HTTP_200_OK,
)
async def wallet_challenge(req: WalletChallengeRequest):
    try:
        challenge = create_wallet_challenge(
            address=req.address,
            chain_id=req.chain_id,
            origin=req.origin,
        )
        return challenge
    except InvariantViolation as exc:
        raise HTTPException(status_code=400, detail=exc.message)


@router.post(
    "/verify",
    response_model=WalletVerifyResponse,
    status_code=status.HTTP_200_OK,
)
async def wallet_verify(req: WalletVerifyRequest):
    token = await authenticate_wallet(
        address=req.address,
        signature=req.signature,
        message=req.message,
        challenge_token=req.challenge_token,
    )
    return {"access_token": token, "token_type": "Bearer"}
