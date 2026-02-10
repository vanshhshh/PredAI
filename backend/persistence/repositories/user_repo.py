# File: backend/persistence/repositories/user_repo.py
"""
PURPOSE
-------
Persistence layer for users (wallet-based identities).

This module:
- encapsulates ALL database access for users
- ensures wallet-address-based identity creation
- tracks governance privileges and reputation
- supports idempotent creation for replay safety

DESIGN RULES (from docs)
------------------------
- Wallet address is the primary key
- No custody or private data stored
- Deterministic, idempotent writes
- No business logic here
"""

from typing import Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.persistence.db import get_session
from backend.security.invariants import InvariantViolation
from backend.persistence.repositories.models import User  # ORM model


class UserRepository:
    # ------------------------------------------------------------------
    # CREATE / ENSURE
    # ------------------------------------------------------------------

    @staticmethod
    async def ensure_exists(address: str) -> User:
        """
        Ensure a user exists for a given wallet address.
        Idempotent: safe to call multiple times.
        """
        async for session in get_session():
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

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    @staticmethod
    async def get_by_address(address: str) -> Optional[User]:
        async for session in get_session():
            return await session.scalar(
                select(User).where(User.address == address)
            )

    @staticmethod
    async def is_governance(address: str) -> bool:
        async for session in get_session():
            user = await session.scalar(
                select(User).where(User.address == address)
            )
            return bool(user and user.is_governance)

    # ------------------------------------------------------------------
    # UPDATE
    # ------------------------------------------------------------------

    @staticmethod
    async def update_profile(
        *,
        address: str,
        username: Optional[str],
    ) -> User:
        async for session in get_session():
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
        async for session in get_session():
            user = await session.scalar(
                select(User).where(User.address == address)
            )
            if not user:
                raise InvariantViolation("USER_NOT_FOUND")

            user.reputation_score += delta
            await session.flush()
            return user
