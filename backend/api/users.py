# File: backend/api/users.py
"""
PURPOSE
-------
HTTP API surface for user-related operations.

This module:
- exposes authenticated user profile endpoints
- provides wallet-linked identity views
- surfaces user activity summaries
- NEVER performs auth verification logic directly

DESIGN RULES (from docs)
------------------------
- Wallet address is the primary identity
- No custody of user funds
- No private data leakage
- Controllers are thin, services do the work
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Optional

from backend.services.user_service import UserService
from backend.security.auth import get_current_user
from backend.security.invariants import InvariantViolation


router = APIRouter()


# -------------------------------------------------------------------
# SCHEMAS
# -------------------------------------------------------------------

class UserProfileResponse(BaseModel):
    address: str = Field(..., description="Wallet address")
    username: Optional[str] = Field(None, description="Optional display name")
    created_at: int = Field(..., description="Unix timestamp")
    reputation_score: int = Field(..., description="Aggregated reputation")
    is_governance: bool = Field(..., description="Governance privileges flag")


class UpdateProfileRequest(BaseModel):
    username: Optional[str] = Field(None, description="New display name")


class UsernameAvailabilityResponse(BaseModel):
    username: str
    available: bool


class ResolveUsernamesRequest(BaseModel):
    addresses: list[str] = Field(default_factory=list)


class ResolveUsernamesResponse(BaseModel):
    usernames: dict[str, str]


# -------------------------------------------------------------------
# ENDPOINTS
# -------------------------------------------------------------------

@router.get(
    "/me",
    response_model=UserProfileResponse,
)
async def get_my_profile(user=Depends(get_current_user)):
    """
    Fetch the authenticated user's profile.
    """
    profile = await UserService.get_user_profile(user.address)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )
    return profile


@router.post(
    "/me",
    response_model=UserProfileResponse,
)
async def update_my_profile(
    req: UpdateProfileRequest,
    user=Depends(get_current_user),
):
    """
    Update mutable user profile fields.
    """
    try:
        return await UserService.update_user_profile(
            address=user.address,
            username=req.username,
        )
    except InvariantViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.get(
    "/username-availability",
    response_model=UsernameAvailabilityResponse,
)
async def username_availability(
    username: str = Query(..., min_length=1),
    address: Optional[str] = Query(default=None),
):
    """
    Public username availability check for onboarding flows.
    """
    try:
        available = await UserService.is_username_available(
            username=username,
            exclude_address=address,
        )
        return {
            "username": username.strip().lower(),
            "available": available,
        }
    except InvariantViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.post(
    "/resolve-usernames",
    response_model=ResolveUsernamesResponse,
)
async def resolve_usernames(req: ResolveUsernamesRequest):
    """
    Resolve wallet addresses to usernames for UI display.
    """
    mapping = await UserService.resolve_usernames(req.addresses)
    return {"usernames": mapping}


@router.get(
    "/{address}",
    response_model=UserProfileResponse,
)
async def get_user_profile(address: str):
    """
    Public user profile lookup by wallet address.
    """
    profile = await UserService.get_user_profile(address)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return profile
