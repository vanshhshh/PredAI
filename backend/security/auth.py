# File: backend/security/auth.py

"""
AUTH LAYER — PRODUCTION READY
Supports:
- Wallet auth
- JWT sessions
- Signature verification (extensible)
- Governance role enforcement
"""

import time
import os
import secrets
import jwt

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.persistence.repositories.user_repo import UserRepository
from backend.security.invariants import InvariantViolation

# -------------------------------------------------------------------
# ENV
# -------------------------------------------------------------------

def _jwt_secret() -> str:
    configured = os.getenv("JWT_SECRET", "").strip()
    if not configured:
        raise RuntimeError("JWT_SECRET_NOT_CONFIGURED")
    if configured == "local-dev-insecure-secret":
        raise RuntimeError("JWT_SECRET_INSECURE_DEFAULT")
    if len(configured) < 32:
        raise RuntimeError("JWT_SECRET_TOO_SHORT")
    return configured


JWT_SECRET = _jwt_secret()
JWT_ALGO = "HS256"
JWT_EXP_SECONDS = 60 * 60 * 24 * 7  # 7 days
WALLET_CHALLENGE_EXP_SECONDS = 60 * 5

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


def create_wallet_challenge(
    *,
    address: str,
    chain_id: int | None = None,
    origin: str | None = None,
) -> dict:
    if not address or not address.startswith("0x") or len(address) != 42:
        raise InvariantViolation("INVALID_WALLET_ADDRESS")

    nonce = secrets.token_urlsafe(24)
    issued_at = int(time.time())
    expires_at = issued_at + WALLET_CHALLENGE_EXP_SECONDS

    normalized_address = address.lower()
    safe_origin = origin or "https://moltmarket.com"
    chain_line = str(chain_id) if chain_id is not None else "unspecified"

    message = (
        "MoltMarket Wallet Authentication\n"
        f"Address: {normalized_address}\n"
        f"Nonce: {nonce}\n"
        f"Chain ID: {chain_line}\n"
        f"Origin: {safe_origin}\n"
        f"Issued At: {issued_at}\n"
        f"Expires At: {expires_at}"
    )

    challenge_token = jwt.encode(
        {
            "typ": "wallet_challenge",
            "address": normalized_address,
            "nonce": nonce,
            "chain_id": chain_id,
            "msg": message,
            "iat": issued_at,
            "exp": expires_at,
        },
        JWT_SECRET,
        algorithm=JWT_ALGO,
    )

    return {
        "message": message,
        "challenge_token": challenge_token,
        "expires_at": expires_at,
    }


def decode_wallet_challenge(challenge_token: str) -> dict:
    try:
        payload = jwt.decode(challenge_token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="CHALLENGE_EXPIRED")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="INVALID_CHALLENGE_TOKEN")

    if payload.get("typ") != "wallet_challenge":
        raise HTTPException(status_code=401, detail="INVALID_CHALLENGE_TYPE")
    return payload

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

    # Only EVM wallet verification is supported right now.
    if not address.startswith("0x") or len(address) != 42:
        return False

    try:
        from eth_account import Account
        from eth_account.messages import encode_defunct
    except Exception:
        # Fail closed when verifier dependencies are missing.
        return False

    try:
        recovered = Account.recover_message(
            encode_defunct(text=message),
            signature=signature,
        )
    except Exception:
        return False

    return recovered.lower() == address.lower()

# -------------------------------------------------------------------
# LOGIN FLOW
# -------------------------------------------------------------------

async def authenticate_wallet(
    *,
    address: str,
    signature: str,
    message: str,
    challenge_token: str | None = None,
) -> str:
    """
    Verifies wallet + returns JWT
    """

    normalized = address.lower()
    if not normalized.startswith("0x") or len(normalized) != 42:
        raise HTTPException(400, "INVALID_WALLET_ADDRESS")

    if challenge_token:
        challenge = decode_wallet_challenge(challenge_token)
        if challenge.get("address") != normalized:
            raise HTTPException(401, "CHALLENGE_ADDRESS_MISMATCH")
        if challenge.get("msg") != message:
            raise HTTPException(401, "CHALLENGE_MESSAGE_MISMATCH")

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
