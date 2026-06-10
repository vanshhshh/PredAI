from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import select

from backend.persistence.db import AsyncSessionLocal
from backend.persistence.repositories.models import ProtocolEvent


class ProtocolEventRepository:
    @staticmethod
    async def append(
        *,
        topic: str,
        event_key: str,
        event_type: str,
        payload: dict[str, Any],
    ) -> ProtocolEvent:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                row = ProtocolEvent(
                    topic=topic,
                    event_key=event_key,
                    event_type=event_type,
                    payload_json=payload or {},
                )
                session.add(row)
                await session.flush()
                return row

    @staticmethod
    async def list_recent(
        *,
        topic: Optional[str] = None,
        event_key: Optional[str] = None,
        limit: int = 100,
    ) -> list[ProtocolEvent]:
        async with AsyncSessionLocal() as session:
            stmt = select(ProtocolEvent).order_by(ProtocolEvent.created_at.desc()).limit(limit)
            if topic:
                stmt = stmt.where(ProtocolEvent.topic == topic)
            if event_key:
                stmt = stmt.where(ProtocolEvent.event_key == event_key)
            rows = await session.scalars(stmt)
            return list(rows)

    @staticmethod
    async def list_since(
        *,
        topic: str,
        event_key: Optional[str] = None,
        after: Optional[datetime] = None,
        limit: int = 100,
    ) -> list[ProtocolEvent]:
        async with AsyncSessionLocal() as session:
            stmt = (
                select(ProtocolEvent)
                .where(ProtocolEvent.topic == topic)
                .order_by(ProtocolEvent.created_at.asc())
                .limit(limit)
            )
            if event_key:
                stmt = stmt.where(ProtocolEvent.event_key == event_key)
            if after:
                stmt = stmt.where(ProtocolEvent.created_at > after)
            rows = await session.scalars(stmt)
            return list(rows)
