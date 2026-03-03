"""
User service (wallet identity + profile updates).
"""

from __future__ import annotations

import re

from backend.persistence.repositories.user_repo import UserRepository
from backend.security.invariants import InvariantViolation

USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 20
USERNAME_PATTERN = re.compile(r"^[a-z0-9_-]+$")


class UserService:
    @staticmethod
    def _normalize_username(username: str) -> str:
        return username.strip().lower()

    @staticmethod
    def _validate_username(username: str) -> str:
        normalized = UserService._normalize_username(username)
        if len(normalized) < USERNAME_MIN_LENGTH:
            raise InvariantViolation("USERNAME_TOO_SHORT")
        if len(normalized) > USERNAME_MAX_LENGTH:
            raise InvariantViolation("USERNAME_TOO_LONG")
        if not USERNAME_PATTERN.fullmatch(normalized):
            raise InvariantViolation("USERNAME_INVALID_FORMAT")
        return normalized

    @staticmethod
    async def is_username_available(
        *,
        username: str,
        exclude_address: str | None = None,
    ) -> bool:
        normalized = UserService._validate_username(username)
        return await UserRepository.is_username_available(
            username=normalized,
            exclude_address=exclude_address,
        )

    @staticmethod
    async def resolve_usernames(addresses: list[str]) -> dict[str, str]:
        return await UserRepository.get_usernames_by_addresses(addresses)

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
            username = UserService._validate_username(username)

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
