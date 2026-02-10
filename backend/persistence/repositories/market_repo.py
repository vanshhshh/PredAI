# File: backend/persistence/repositories/market_repo.py
"""
PURPOSE
-------
Persistence layer for prediction markets.

This module:
- encapsulates ALL database access for markets
- provides idempotent CRUD operations
- is the ONLY place allowed to touch ORM models for markets

DESIGN RULES (from docs)
------------------------
- No business logic here
- No blockchain calls
- Deterministic queries
- Idempotent writes (safe for replay)
"""

from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.persistence.db import get_session
from backend.security.invariants import InvariantViolation
from backend.persistence.repositories.models import Market  # ORM model


class MarketRepository:
    # ------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------

    @staticmethod
    async def create(
        *,
        market_id: str,
        address: str,
        creator: str,
        start_time: int,
        end_time: int,
        max_exposure: int,
        metadata_uri: str,
        settled: bool,
        final_outcome: Optional[bool],
    ):
        async for session in get_session():
            market = Market(
                market_id=market_id,
                address=address,
                creator=creator,
                start_time=start_time,
                end_time=end_time,
                max_exposure=max_exposure,
                metadata_uri=metadata_uri,
                settled=settled,
                final_outcome=final_outcome,
            )
            session.add(market)
            await session.flush()
            return market

    @staticmethod
    async def create_from_event(
        *,
        market_id: str,
        address: str,
        creator: str,
        start_time: int,
        end_time: int,
        max_exposure: int,
        metadata_uri: str,
    ):
        """
        Idempotent creation used by indexer replay.
        """
        async for session in get_session():
            exists = await session.scalar(
                select(Market).where(Market.market_id == market_id)
            )
            if exists:
                return exists

            market = Market(
                market_id=market_id,
                address=address,
                creator=creator,
                start_time=start_time,
                end_time=end_time,
                max_exposure=max_exposure,
                metadata_uri=metadata_uri,
                settled=False,
                final_outcome=None,
            )
            session.add(market)
            await session.flush()
            return market

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    @staticmethod
    async def get_by_market_id(market_id: str) -> Optional[Market]:
        async for session in get_session():
            return await session.scalar(
                select(Market).where(Market.market_id == market_id)
            )

    @staticmethod
    async def list(limit: int, offset: int) -> List[Market]:
        async for session in get_session():
            result = await session.scalars(
                select(Market)
                .order_by(Market.start_time.desc())
                .limit(limit)
                .offset(offset)
            )
            return list(result)

    # ------------------------------------------------------------------
    # UPDATE
    # ------------------------------------------------------------------

    @staticmethod
    async def mark_settled(
        *,
        market_id: str,
        final_outcome: bool,
    ):
        async for session in get_session():
            result = await session.execute(
                update(Market)
                .where(Market.market_id == market_id)
                .values(settled=True, final_outcome=final_outcome)
            )
            if result.rowcount == 0:
                raise InvariantViolation("MARKET_NOT_FOUND")
