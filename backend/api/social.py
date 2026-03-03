"""
Social signal endpoints (feeds, staking, prompt compilation, spawn).
"""

from __future__ import annotations

import hashlib
import json
import time

import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.core.config import settings
from backend.persistence.repositories.social_repo import SocialRepository
from backend.security.invariants import InvariantViolation
from backend.services.market_service import MarketService


router = APIRouter()


class StakeRequest(BaseModel):
    argumentId: str
    amount: int = Field(..., gt=0)


class SpawnRequest(BaseModel):
    feedId: str


class CompileRequest(BaseModel):
    prompt: str = Field(..., min_length=1)


class IngestRequest(BaseModel):
    source: str
    external_id: str
    author: str
    content: str
    timestamp: int = Field(..., gt=0)
    metadata: dict = Field(default_factory=dict)


@router.post("/ingest", status_code=status.HTTP_201_CREATED)
async def ingest_feed(req: IngestRequest):
    event_id = hashlib.sha256(f"{req.source}:{req.external_id}".encode()).hexdigest()
    if await SocialRepository.exists(req.source, req.external_id):
        return {"event_id": event_id, "status": "duplicate"}

    created = await SocialRepository.create_event(
        event_id=event_id,
        source=req.source,
        external_id=req.external_id,
        author=req.author,
        content=req.content,
        timestamp=req.timestamp,
        metadata=req.metadata,
    )
    return {"event_id": created.event_id, "status": "ingested"}


@router.get("/feeds")
async def list_feeds():
    events = await SocialRepository.list_recent_events(limit=200)
    feeds = [
        {
            "id": row.event_id,
            "source": row.source,
            "author": row.author,
            "content": row.content,
            "timestamp": int(row.timestamp),
            "signalScore": round(int(row.signal_score_bps) / 10_000, 4),
            "marketEligible": bool(row.market_eligible),
        }
        for row in events
    ]
    return {"feeds": feeds}


@router.post("/stake")
async def stake_argument(req: StakeRequest):
    updated = await SocialRepository.apply_signal_stake(
        event_id=req.argumentId,
        amount=req.amount,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="ARGUMENT_NOT_FOUND")

    return {
        "status": "staked",
        "argumentId": updated.event_id,
        "signalScore": round(int(updated.signal_score_bps) / 10_000, 4),
    }


@router.post("/spawn")
async def spawn_market(req: SpawnRequest):
    event = await SocialRepository.get_event(req.feedId)
    if not event:
        raise HTTPException(status_code=404, detail="FEED_NOT_FOUND")

    now = int(time.time())
    market_id = hashlib.sha256(
        f"{event.source}:{event.external_id}:{event.content}".encode()
    ).hexdigest()

    try:
        created = await MarketService.create_market(
            creator="social-relayer",
            market_id=market_id,
            start_time=now + 300,
            end_time=now + 30 * 24 * 60 * 60,
            max_exposure=10_000,
            metadata_uri=json.dumps(
                {
                    "title": event.content[:160],
                    "description": f"Spawned from {event.source} by {event.author}",
                    "social_event_id": event.event_id,
                }
            ),
        )
    except InvariantViolation as exc:
        raise HTTPException(status_code=400, detail=exc.message)

    return {
        "status": "spawned",
        "marketId": created.market_id,
    }


@router.post("/compile")
async def compile_prompt(req: CompileRequest):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_NOT_CONFIGURED",
        )

    prompt = req.prompt.strip()
    system = (
        "Convert a social trading prompt into a prediction market spec JSON. "
        "Return strict JSON with keys: title, description, resolutionSource, "
        "resolutionTime, outcomes, confidence."
    )

    payload = {
        "model": settings.AI_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            raw = (
                resp.json()
                .get("choices", [{}])[0]
                .get("message", {})
                .get("content", "{}")
            )
            compiled = json.loads(raw)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="SOCIAL_COMPILE_FAILED",
        ) from exc

    compiled.setdefault("title", prompt[:120])
    compiled.setdefault("description", prompt)
    compiled.setdefault("resolutionSource", "Oracle committee")
    compiled.setdefault("resolutionTime", int(time.time()) + 21 * 24 * 60 * 60)
    compiled.setdefault("outcomes", ["YES", "NO"])
    compiled["confidence"] = float(compiled.get("confidence", 0.5))

    return compiled
