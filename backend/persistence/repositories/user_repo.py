# File: backend/persistence/repositories/user_repo.py
"""
Persistence layer for users (wallet-based identities).

Repository rules:
- wallet identity only (no custody data)
- deterministic data access
- no business logic
"""

from typing import Optional

from sqlalchemy import select, update

from backend.persistence.db import AsyncSessionLocal
from backend.persistence.repositories.models import User
from backend.security.invariants import InvariantViolation


class UserRepository:
    @staticmethod
    async def ensure_exists(address: str) -> User:
        """
        Ensure a user exists for a given wallet address.
        Idempotent and replay-safe.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                user = await session.scalar(
                    select(User).where(User.address == address)
                )
                if user:
                    return user

                user = User(
                    address=address,
                    reputation_score=0,
                    is_governance=False,
                )
                session.add(user)
                await session.flush()
                return user

    @staticmethod
    async def get_by_address(address: str) -> Optional[User]:
        async with AsyncSessionLocal() as session:
            return await session.scalar(
                select(User).where(User.address == address)
            )

    @staticmethod
    async def is_governance(address: str) -> bool:
        async with AsyncSessionLocal() as session:
            user = await session.scalar(
                select(User).where(User.address == address)
            )
            return bool(user and user.is_governance)

    @staticmethod
    async def update_profile(
        *,
        address: str,
        username: Optional[str],
    ) -> User:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                result = await session.execute(
                    update(User)
                    .where(User.address == address)
                    .values(username=username)
                )
                if result.rowcount == 0:
                    raise InvariantViolation("USER_NOT_FOUND")

                return await session.scalar(
                    select(User).where(User.address == address)
                )

    @staticmethod
    async def update_reputation(
        *,
        address: str,
        delta: int,
    ):
        async with AsyncSessionLocal() as session:
            async with session.begin():
                user = await session.scalar(
                    select(User).where(User.address == address)
                )
                if not user:
                    raise InvariantViolation("USER_NOT_FOUND")

                user.reputation_score += delta
                await session.flush()
                return user
