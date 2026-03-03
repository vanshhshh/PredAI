# File: backend/persistence/repositories/user_repo.py
"""
Persistence layer for users (wallet-based identities).

Repository rules:
- wallet identity only (no custody data)
- deterministic data access
- no business logic
"""

from typing import Optional

from sqlalchemy import func, select, update

from backend.persistence.db import AsyncSessionLocal
from backend.persistence.repositories.models import User
from backend.security.invariants import InvariantViolation


class UserRepository:
    @staticmethod
    def _normalize_address(address: str) -> str:
        return address.strip().lower()

    @staticmethod
    def _normalize_username(username: str) -> str:
        return username.strip().lower()

    @staticmethod
    async def ensure_exists(address: str) -> User:
        """
        Ensure a user exists for a given wallet address.
        Idempotent and replay-safe.
        """
        normalized = UserRepository._normalize_address(address)
        async with AsyncSessionLocal() as session:
            async with session.begin():
                user = await session.scalar(
                    select(User).where(User.address == normalized)
                )
                if user:
                    return user

                user = User(
                    address=normalized,
                    reputation_score=0,
                    is_governance=False,
                )
                session.add(user)
                await session.flush()
                return user

    @staticmethod
    async def get_by_address(address: str) -> Optional[User]:
        normalized = UserRepository._normalize_address(address)
        async with AsyncSessionLocal() as session:
            return await session.scalar(
                select(User).where(User.address == normalized)
            )

    @staticmethod
    async def get_usernames_by_addresses(addresses: list[str]) -> dict[str, str]:
        normalized = [
            UserRepository._normalize_address(address)
            for address in addresses
            if address and address.strip()
        ]
        if not normalized:
            return {}

        async with AsyncSessionLocal() as session:
            rows = await session.scalars(
                select(User).where(User.address.in_(normalized))
            )
            mapping: dict[str, str] = {}
            for row in rows:
                if row.username:
                    mapping[row.address.lower()] = row.username
            return mapping

    @staticmethod
    async def is_username_available(
        *,
        username: str,
        exclude_address: Optional[str] = None,
    ) -> bool:
        normalized_username = UserRepository._normalize_username(username)
        normalized_exclude = (
            UserRepository._normalize_address(exclude_address)
            if exclude_address
            else None
        )
        async with AsyncSessionLocal() as session:
            stmt = select(User).where(
                func.lower(User.username) == normalized_username
            )
            if normalized_exclude:
                stmt = stmt.where(User.address != normalized_exclude)
            existing = await session.scalar(stmt)
            return existing is None

    @staticmethod
    async def is_governance(address: str) -> bool:
        normalized = UserRepository._normalize_address(address)
        async with AsyncSessionLocal() as session:
            user = await session.scalar(
                select(User).where(User.address == normalized)
            )
            return bool(user and user.is_governance)

    @staticmethod
    async def update_profile(
        *,
        address: str,
        username: Optional[str],
    ) -> User:
        normalized_address = UserRepository._normalize_address(address)
        normalized_username = (
            UserRepository._normalize_username(username) if username else None
        )
        if normalized_username:
            available = await UserRepository.is_username_available(
                username=normalized_username,
                exclude_address=normalized_address,
            )
            if not available:
                raise InvariantViolation("USERNAME_ALREADY_TAKEN")

        async with AsyncSessionLocal() as session:
            async with session.begin():
                result = await session.execute(
                    update(User)
                    .where(User.address == normalized_address)
                    .values(username=normalized_username)
                )
                if result.rowcount == 0:
                    raise InvariantViolation("USER_NOT_FOUND")

                return await session.scalar(
                    select(User).where(User.address == normalized_address)
                )

    @staticmethod
    async def update_reputation(
        *,
        address: str,
        delta: int,
    ):
        normalized = UserRepository._normalize_address(address)
        async with AsyncSessionLocal() as session:
            async with session.begin():
                user = await session.scalar(
                    select(User).where(User.address == normalized)
                )
                if not user:
                    raise InvariantViolation("USER_NOT_FOUND")

                user.reputation_score += delta
                await session.flush()
                return user
