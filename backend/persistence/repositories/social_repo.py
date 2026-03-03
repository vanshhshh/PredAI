"""
Async persistence for social ingestion and staged markets.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import select

from backend.persistence.db import AsyncSessionLocal
from backend.persistence.repositories.models import SocialEvent, StagedMarket


class SocialRepository:
    @staticmethod
    async def exists(source: str, external_id: str) -> bool:
        async with AsyncSessionLocal() as session:
            row = await session.scalar(
                select(SocialEvent).where(
                    SocialEvent.source == source,
                    SocialEvent.external_id == external_id,
                )
            )
            return row is not None

    @staticmethod
    async def create_event(
        *,
        event_id: str,
        source: str,
        external_id: str,
        author: str,
        content: str,
        timestamp: int,
        metadata: dict,
    ):
        async with AsyncSessionLocal() as session:
            async with session.begin():
                row = SocialEvent(
                    event_id=event_id,
                    source=source,
                    external_id=external_id,
                    author=author,
                    content=content,
                    timestamp=timestamp,
                    metadata_json=metadata or {},
                )
                session.add(row)
                await session.flush()
                return row

    @staticmethod
    async def get_event(event_id: str) -> Optional[SocialEvent]:
        async with AsyncSessionLocal() as session:
            return await session.scalar(
                select(SocialEvent).where(SocialEvent.event_id == event_id)
            )

    @staticmethod
    async def stage_market(
        *,
        event_id: str,
        prompt: str,
    ):
        async with AsyncSessionLocal() as session:
            async with session.begin():
                row = StagedMarket(
                    event_id=event_id,
                    prompt=prompt,
                )
                session.add(row)
                await session.flush()
                return row

    @staticmethod
    async def get_staged_market(staged_market_id: str) -> Optional[StagedMarket]:
        async with AsyncSessionLocal() as session:
            return await session.scalar(
                select(StagedMarket).where(StagedMarket.staged_market_id == staged_market_id)
            )

    @staticmethod
    async def list_recent_events(limit: int = 100):
        async with AsyncSessionLocal() as session:
            result = await session.scalars(
                select(SocialEvent)
                .order_by(SocialEvent.timestamp.desc())
                .limit(limit)
            )
            return list(result)

    @staticmethod
    async def apply_signal_stake(
        *,
        event_id: str,
        amount: int,
    ):
        async with AsyncSessionLocal() as session:
            async with session.begin():
                event = await session.scalar(
                    select(SocialEvent).where(SocialEvent.event_id == event_id)
                )
                if not event:
                    return None

                boost_bps = min(2000, max(0, int(amount // 10)))
                event.signal_score_bps = min(10_000, int(event.signal_score_bps) + boost_bps)
                return event
