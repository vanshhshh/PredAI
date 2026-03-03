"""
User service (wallet identity + profile updates).
"""

from __future__ import annotations

from backend.persistence.repositories.user_repo import UserRepository
from backend.security.invariants import InvariantViolation


class UserService:
    @staticmethod
    async def get_user_profile(address: str):
        user = await UserRepository.get_by_address(address)
        if not user:
            return None

        created_ts = int(user.created_at.timestamp()) if user.created_at else 0
        return {
            "address": user.address,
            "username": user.username,
            "created_at": created_ts,
            "reputation_score": int(user.reputation_score),
            "is_governance": bool(user.is_governance),
        }

    @staticmethod
    async def update_user_profile(
        *,
        address: str,
        username: str | None,
    ):
        if username is not None:
            normalized = username.strip()
            if len(normalized) > 64:
                raise InvariantViolation("USERNAME_TOO_LONG")
            username = normalized or None

        await UserRepository.ensure_exists(address)
        updated = await UserRepository.update_profile(
            address=address,
            username=username,
        )
        created_ts = int(updated.created_at.timestamp()) if updated.created_at else 0
        return {
            "address": updated.address,
            "username": updated.username,
            "created_at": created_ts,
            "reputation_score": int(updated.reputation_score),
            "is_governance": bool(updated.is_governance),
        }
