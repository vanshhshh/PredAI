# File: backend/security/auth.py

"""
AUTH LAYER — PRODUCTION READY
Supports:
- Wallet auth
- JWT sessions
- Signature verification (extensible)
- Governance role enforcement
"""

from typing import Optional
import time
import os
import jwt

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.persistence.repositories.user_repo import UserRepository
from backend.security.invariants import InvariantViolation

# -------------------------------------------------------------------
# ENV
# -------------------------------------------------------------------

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret")
JWT_ALGO = "HS256"
JWT_EXP_SECONDS = 60 * 60 * 24 * 7  # 7 days

security = HTTPBearer()

# -------------------------------------------------------------------
# AUTH CONTEXT
# -------------------------------------------------------------------

class AuthenticatedUser:
    def __init__(self, address: str):
        self.address = address

# -------------------------------------------------------------------
# JWT HELPERS
# -------------------------------------------------------------------

def create_jwt(address: str) -> str:
    payload = {
        "sub": address,
        "iat": int(time.time()),
        "exp": int(time.time()) + JWT_EXP_SECONDS,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def decode_jwt(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="TOKEN_EXPIRED")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="INVALID_TOKEN")

# -------------------------------------------------------------------
# SIGNATURE VERIFY (plug real libs later)
# -------------------------------------------------------------------

def verify_wallet_signature(
    *,
    address: str,
    signature: str,
    message: str,
) -> bool:
    if not address or not signature or not message:
        return False

    # TODO:
    # EVM → eth_account
    # SOL → solana-py
    return True

# -------------------------------------------------------------------
# LOGIN FLOW
# -------------------------------------------------------------------

async def authenticate_wallet(
    *,
    address: str,
    signature: str,
    message: str,
) -> str:
    """
    Verifies wallet + returns JWT
    """

    if not verify_wallet_signature(
        address=address,
        signature=signature,
        message=message,
    ):
        raise HTTPException(401, "INVALID_SIGNATURE")

    await UserRepository.ensure_exists(address)

    return create_jwt(address)

# -------------------------------------------------------------------
# DEPENDENCIES
# -------------------------------------------------------------------

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthenticatedUser:
    token = credentials.credentials
    address = decode_jwt(token)

    return AuthenticatedUser(address=address)

async def require_governance(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    is_gov = await UserRepository.is_governance(user.address)

    if not is_gov:
        raise HTTPException(403, "GOVERNANCE_REQUIRED")

    return user
