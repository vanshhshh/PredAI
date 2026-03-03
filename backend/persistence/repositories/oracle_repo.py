# File: backend/persistence/repositories/oracle_repo.py
"""
Persistence layer for oracle identities and submissions.

Repository rules:
- deterministic query/write behavior
- no consensus or business logic
- idempotent event-replay support
"""

from typing import List, Optional

from sqlalchemy import select, update

from backend.persistence.db import AsyncSessionLocal
from backend.persistence.repositories.models import Oracle, OracleSubmission
from backend.security.invariants import InvariantViolation


class OracleRepository:
    @staticmethod
    async def create(
        *,
        oracle_id: str,
        address: str,
        metadata_uri: str,
        active: bool,
        stake: int,
    ):
        async with AsyncSessionLocal() as session:
            async with session.begin():
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
        async with AsyncSessionLocal() as session:
            async with session.begin():
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

    @staticmethod
    async def get_by_oracle_id(oracle_id: str) -> Optional[Oracle]:
        async with AsyncSessionLocal() as session:
            return await session.scalar(
                select(Oracle).where(Oracle.oracle_id == oracle_id)
            )

    @staticmethod
    async def get_by_address(address: str) -> Optional[Oracle]:
        async with AsyncSessionLocal() as session:
            return await session.scalar(
                select(Oracle).where(Oracle.address == address)
            )

    @staticmethod
    async def list(limit: int, offset: int) -> List[Oracle]:
        async with AsyncSessionLocal() as session:
            result = await session.scalars(
                select(Oracle)
                .order_by(Oracle.stake.desc())
                .limit(limit)
                .offset(offset)
            )
            return list(result)

    @staticmethod
    async def update_stake(
        *,
        oracle_address: str,
        stake: int,
        active: bool,
    ):
        async with AsyncSessionLocal() as session:
            async with session.begin():
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

    @staticmethod
    async def record_submission(
        *,
        oracle_address: str,
        market_id: str,
        outcome: bool,
    ):
        """
        Record an oracle submission for audit/scoring pipelines.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
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

    @staticmethod
    async def list_submissions_by_market(market_id: str) -> List[OracleSubmission]:
        async with AsyncSessionLocal() as session:
            result = await session.scalars(
                select(OracleSubmission)
                .where(OracleSubmission.market_id == market_id)
                .order_by(OracleSubmission.created_at.desc())
            )
            return list(result)
