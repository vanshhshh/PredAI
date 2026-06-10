from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from backend.persistence.repositories.models import ProtocolEvent

from backend.persistence.repositories.protocol_event_repo import ProtocolEventRepository
from backend.realtime.bus import bus


router = APIRouter()


def _format_sse(event: dict[str, Any]) -> str:
    event_id = str(event.get("id") or "")
    event_name = str(event.get("event") or "message")
    data = json.dumps(event, separators=(",", ":"), default=str)
    return f"id: {event_id}\nevent: {event_name}\ndata: {data}\n\n"


def _event_to_envelope(event: ProtocolEvent) -> dict[str, Any]:
    return {
        "id": event.event_id,
        "event": event.event_type,
        "topic": event.topic,
        "key": event.event_key,
        "payload": event.payload_json,
        "created_at": event.created_at.isoformat(),
    }


def _parse_created_at(value: object) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


async def _stream(request: Request, topic: str):
    base_topic = topic.split(":", 1)[0]
    event_key = topic.split(":", 1)[1] if ":" in topic else None
    seen_ids: set[str] = set()
    last_seen_at: datetime | None = None

    recent = await ProtocolEventRepository.list_recent(topic=base_topic, limit=25)
    if ":" in topic:
        recent = [event for event in recent if event.event_key == event_key]

    for event in reversed(recent):
        if await request.is_disconnected():
            return
        envelope = _event_to_envelope(event)
        seen_ids.add(str(envelope["id"]))
        last_seen_at = event.created_at
        yield _format_sse(envelope)

    redis_url = os.getenv("REDIS_URL", "").strip()
    if redis_url:
        try:
            import redis.asyncio as redis

            client = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
            pubsub = client.pubsub()
            await pubsub.subscribe(f"moltmarket:{topic}")
            try:
                yield ": connected\n\n"
                while not await request.is_disconnected():
                    message = await pubsub.get_message(
                        ignore_subscribe_messages=True,
                        timeout=15,
                    )
                    if message and message.get("data"):
                        yield _format_sse(json.loads(str(message["data"])))
                    else:
                        yield ": keepalive\n\n"
            finally:
                await pubsub.unsubscribe(f"moltmarket:{topic}")
                await pubsub.aclose()
                await client.aclose()
            return
        except Exception:
            pass

    queue = await bus.subscribe(topic)
    try:
        yield ": connected\n\n"
        while not await request.is_disconnected():
            try:
                event = await asyncio.wait_for(queue.get(), timeout=15)
                event_id = str(event.get("id") or "")
                if event_id and event_id in seen_ids:
                    continue
                if event_id:
                    seen_ids.add(event_id)
                last_seen_at = _parse_created_at(event.get("created_at")) or last_seen_at
                yield _format_sse(event)
            except asyncio.TimeoutError:
                rows = await ProtocolEventRepository.list_since(
                    topic=base_topic,
                    event_key=event_key,
                    after=last_seen_at,
                    limit=100,
                )
                for row in rows:
                    envelope = _event_to_envelope(row)
                    event_id = str(envelope["id"])
                    if event_id in seen_ids:
                        continue
                    seen_ids.add(event_id)
                    last_seen_at = row.created_at
                    yield _format_sse(envelope)
                yield ": keepalive\n\n"
    finally:
        await bus.unsubscribe(topic, queue)


@router.get("/markets")
async def stream_markets(request: Request):
    return StreamingResponse(
        _stream(request, "markets"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/markets/{market_id}")
async def stream_market(request: Request, market_id: str):
    return StreamingResponse(
        _stream(request, f"markets:{market_id}"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
