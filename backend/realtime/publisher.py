from __future__ import annotations

import logging
import json
import os
from typing import Any

from backend.persistence.repositories.protocol_event_repo import ProtocolEventRepository
from backend.realtime.bus import bus


logger = logging.getLogger(__name__)


async def _publish_redis(topic: str, envelope: dict[str, Any], extra_topics: list[str]) -> None:
    redis_url = os.getenv("REDIS_URL", "").strip()
    if not redis_url:
        return
    try:
        import redis.asyncio as redis

        client = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
        payload = json.dumps(envelope, separators=(",", ":"), default=str)
        channels = [topic, f"{topic}:{envelope['key']}", *extra_topics]
        for channel in channels:
            await client.publish(f"moltmarket:{channel}", payload)
        await client.aclose()
    except Exception as exc:
        logger.warning("redis realtime publish failed for %s: %s", topic, exc)


async def publish_protocol_event(
    *,
    event_type: str,
    event_key: str,
    payload: dict[str, Any],
    topic: str = "protocol",
    extra_topics: list[str] | None = None,
) -> None:
    """
    Persist an event for replay/debugging, then fan it out to local SSE clients.

    Multi-process production deployments use Redis Pub/Sub when REDIS_URL is
    configured. SSE also polls the persisted outbox as a fallback.
    """
    try:
        row = await ProtocolEventRepository.append(
            topic=topic,
            event_key=event_key,
            event_type=event_type,
            payload=payload,
        )
        envelope = {
            "id": row.event_id,
            "event": event_type,
            "topic": topic,
            "key": event_key,
            "payload": payload,
            "created_at": row.created_at.isoformat(),
        }
        await bus.publish(topic, envelope)
        await bus.publish(f"{topic}:{event_key}", envelope)
        for extra_topic in extra_topics or []:
            await bus.publish(extra_topic, envelope)
        await _publish_redis(topic, envelope, extra_topics or [])
    except Exception as exc:
        logger.warning("realtime publish failed for %s/%s: %s", event_type, event_key, exc)
