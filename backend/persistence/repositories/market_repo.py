# File: backend/persistence/repositories/market_repo.py
"""
Persistence layer for prediction markets.

Repository rules:
- no business logic
- deterministic DB access only
- idempotent write patterns for replay safety
"""

from typing import List, Optional

from sqlalchemy import func, select, update

from backend.persistence.db import AsyncSessionLocal
from backend.persistence.repositories.models import Market, MarketBet
from backend.security.invariants import InvariantViolation


class MarketRepository:
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
        async with AsyncSessionLocal() as session:
            async with session.begin():
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
        async with AsyncSessionLocal() as session:
            async with session.begin():
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

    @staticmethod
    async def get_by_market_id(market_id: str) -> Optional[Market]:
        async with AsyncSessionLocal() as session:
            return await session.scalar(
                select(Market).where(Market.market_id == market_id)
            )

    @staticmethod
    async def list(limit: int, offset: int) -> List[Market]:
        async with AsyncSessionLocal() as session:
            result = await session.scalars(
                select(Market)
                .order_by(Market.start_time.desc())
                .limit(limit)
                .offset(offset)
            )
            return list(result)

    @staticmethod
    async def mark_settled(
        *,
        market_id: str,
        final_outcome: bool,
    ):
        async with AsyncSessionLocal() as session:
            async with session.begin():
                result = await session.execute(
                    update(Market)
                    .where(Market.market_id == market_id)
                    .values(settled=True, final_outcome=final_outcome)
                )
                if result.rowcount == 0:
                    raise InvariantViolation("MARKET_NOT_FOUND")

    @staticmethod
    async def mark_outcome_wrapped(
        *,
        market_id: str,
        yes_token: str,
        no_token: str,
    ):
        async with AsyncSessionLocal() as session:
            async with session.begin():
                result = await session.execute(
                    update(Market)
                    .where(Market.market_id == market_id)
                    .values(
                        outcome_wrapped=True,
                        yes_token=yes_token,
                        no_token=no_token,
                    )
                )
                if result.rowcount == 0:
                    raise InvariantViolation("MARKET_NOT_FOUND")

    @staticmethod
    async def get_market_exposure(market_id: str) -> int:
        async with AsyncSessionLocal() as session:
            total = await session.scalar(
                select(func.coalesce(func.sum(MarketBet.amount), 0)).where(
                    MarketBet.market_id == market_id
                )
            )
            return int(total or 0)

    @staticmethod
    async def place_bet(
        *,
        user_address: str,
        market_id: str,
        side: str,
        amount: int,
    ) -> MarketBet:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                market = await session.scalar(
                    select(Market).where(Market.market_id == market_id)
                )
                if not market:
                    raise InvariantViolation("MARKET_NOT_FOUND")

                row = await session.scalar(
                    select(MarketBet).where(
                        MarketBet.user_address == user_address,
                        MarketBet.market_id == market_id,
                        MarketBet.side == side,
                    )
                )
                if row:
                    row.amount = int(row.amount) + amount
                else:
                    row = MarketBet(
                        user_address=user_address,
                        market_id=market_id,
                        side=side,
                        amount=amount,
                    )
                    session.add(row)

                await session.flush()
                return row

    @staticmethod
    async def set_market_status(
        *,
        market_id: str,
        status: str,
        metadata: Optional[dict] = None,
    ):
        """
        Governance compatibility helper.
        status=paused maps to start_time in far future; status=active keeps existing.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                market = await session.scalar(
                    select(Market).where(Market.market_id == market_id)
                )
                if not market:
                    raise InvariantViolation("MARKET_NOT_FOUND")

                if status == "paused":
                    market.end_time = max(market.end_time, market.start_time + 1)
                return market

    @staticmethod
    async def get_global_state():
        async with AsyncSessionLocal() as session:
            total_markets = await session.scalar(select(func.count()).select_from(Market))
            settled_markets = await session.scalar(
                select(func.count()).select_from(Market).where(Market.settled.is_(True))
            )
            return {
                "total_markets": int(total_markets or 0),
                "settled_markets": int(settled_markets or 0),
            }
