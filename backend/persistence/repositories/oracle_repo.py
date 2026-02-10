# File: backend/persistence/repositories/oracle_repo.py
"""
PURPOSE
-------
Persistence layer for oracles.

This module:
- encapsulates ALL database access for oracle identities
- tracks stake, activity status, and submissions
- supports idempotent writes for indexer replay
- NEVER contains business logic or consensus logic

DESIGN RULES (from docs)
------------------------
- No service logic here
- No blockchain calls
- Deterministic queries
- Idempotent updates
"""

from typing import List, Optional
from sqlalchemy import select, update, insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend.persistence.db import get_session
from backend.security.invariants import InvariantViolation
from backend.persistence.repositories.models import Oracle, OracleSubmission  # ORM models


class OracleRepository:
    # ------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------

    @staticmethod
    async def create(
        *,
        oracle_id: str,
        address: str,
        metadata_uri: str,
        active: bool,
        stake: int,
    ):
        async for session in get_session():
            oracle = Oracle(
                oracle_id=oracle_id,
                address=address,
                metadata_uri=metadata_uri,
                active=active,
                stake=stake,
            )
            session.add(oracle)
            await session.flush()
            return oracle

    @staticmethod
    async def create_from_event(
        *,
        oracle_id: str,
        address: str,
        metadata_uri: str,
    ):
        """
        Idempotent creation for indexer replay.
        """
        async for session in get_session():
            exists = await session.scalar(
                select(Oracle).where(Oracle.oracle_id == oracle_id)
            )
            if exists:
                return exists

            oracle = Oracle(
                oracle_id=oracle_id,
                address=address,
                metadata_uri=metadata_uri,
                active=False,
                stake=0,
            )
            session.add(oracle)
            await session.flush()
            return oracle

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    @staticmethod
    async def get_by_oracle_id(oracle_id: str) -> Optional[Oracle]:
        async for session in get_session():
            return await session.scalar(
                select(Oracle).where(Oracle.oracle_id == oracle_id)
            )

    @staticmethod
    async def get_by_address(address: str) -> Optional[Oracle]:
        async for session in get_session():
            return await session.scalar(
                select(Oracle).where(Oracle.address == address)
            )

    @staticmethod
    async def list(limit: int, offset: int) -> List[Oracle]:
        async for session in get_session():
            result = await session.scalars(
                select(Oracle)
                .order_by(Oracle.stake.desc())
                .limit(limit)
                .offset(offset)
            )
            return list(result)

    # ------------------------------------------------------------------
    # UPDATE
    # ------------------------------------------------------------------

    @staticmethod
    async def update_stake(
        *,
        oracle_address: str,
        stake: int,
        active: bool,
    ):
        async for session in get_session():
            result = await session.execute(
                update(Oracle)
                .where(Oracle.address == oracle_address)
                .values(stake=stake, active=active)
            )
            if result.rowcount == 0:
                raise InvariantViolation("ORACLE_NOT_FOUND")

            return await session.scalar(
                select(Oracle).where(Oracle.address == oracle_address)
            )

    # ------------------------------------------------------------------
    # SUBMISSIONS
    # ------------------------------------------------------------------

    @staticmethod
    async def record_submission(
        *,
        oracle_address: str,
        market_id: str,
        outcome: bool,
    ):
        """
        Record an oracle submission.

        NOTE:
        -----
        This does not resolve the market.
        Used for auditing, scoring, and slashing pipelines.
        """
        async for session in get_session():
            oracle = await session.scalar(
                select(Oracle).where(Oracle.address == oracle_address)
            )
            if not oracle:
                raise InvariantViolation("ORACLE_NOT_FOUND")

            submission = OracleSubmission(
                oracle_address=oracle_address,
                market_id=market_id,
                outcome=outcome,
            )
            session.add(submission)
            await session.flush()
            return submission
