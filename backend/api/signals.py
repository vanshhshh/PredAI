from __future__ import annotations

import math
import re
from typing import Any

import httpx
from fastapi import APIRouter, Query

from backend.persistence.repositories.social_repo import SocialRepository
from backend.services.social_service import SocialService


router = APIRouter()

COINGECKO_SIMPLE_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price"
CRYPTO_ASSETS = {
    "bitcoin": "bitcoin",
    "btc": "bitcoin",
    "ethereum": "ethereum",
    "eth": "ethereum",
    "solana": "solana",
    "sol": "solana",
    "xrp": "ripple",
    "ripple": "ripple",
    "doge": "dogecoin",
    "dogecoin": "dogecoin",
}


def _clamp_bps(value: int | float) -> int:
    return max(0, min(10_000, int(round(float(value)))))


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def _keyword_delta_bps(text: str) -> int:
    positive = {
        "approve",
        "approved",
        "beat",
        "bull",
        "higher",
        "increase",
        "launch",
        "pass",
        "record",
        "surge",
        "win",
    }
    negative = {
        "bear",
        "below",
        "cancel",
        "delay",
        "drop",
        "fail",
        "lower",
        "lose",
        "reject",
        "under",
    }
    words = _tokens(text)
    return 180 * (len(words & positive) - len(words & negative))


async def _social_component(title: str, description: str) -> dict[str, Any]:
    query_words = _tokens(f"{title} {description}")
    if not query_words:
        return {"available": False}

    events = await SocialRepository.list_recent_events(limit=200)
    matched: list[tuple[int, int]] = []
    for event in events:
        event_words = _tokens(str(event.content or ""))
        overlap = query_words & event_words
        if len(overlap) < 2:
            continue
        score_bps = int(event.signal_score_bps or 0)
        if score_bps <= 0:
            score_bps, _ = SocialService.heuristic_signal_score(
                content=str(event.content or ""),
                metadata=event.metadata_json or {},
            )
        matched.append((score_bps, len(overlap)))

    if not matched:
        return {"available": False}

    weighted_score = sum(score * weight for score, weight in matched)
    weight_total = sum(weight for _, weight in matched)
    avg_score = weighted_score / max(1, weight_total)
    probability = 5_000 + ((avg_score - 5_000) * 0.35)
    return {
        "available": True,
        "matches": len(matched),
        "probability_bps": _clamp_bps(probability),
        "confidence_bps": _clamp_bps(min(2_500, 400 + len(matched) * 175)),
    }


async def _crypto_component(title: str, description: str) -> dict[str, Any]:
    words = _tokens(f"{title} {description}")
    ids = sorted({asset_id for key, asset_id in CRYPTO_ASSETS.items() if key in words})
    if not ids:
        return {"available": False}

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(
                COINGECKO_SIMPLE_PRICE_URL,
                params={
                    "ids": ",".join(ids[:4]),
                    "vs_currencies": "usd",
                    "include_24hr_change": "true",
                },
            )
            response.raise_for_status()
            payload = response.json()
    except Exception:
        return {"available": False}

    changes = [
        float(value.get("usd_24h_change"))
        for value in payload.values()
        if isinstance(value, dict) and value.get("usd_24h_change") is not None
    ]
    changes = [value for value in changes if math.isfinite(value)]
    if not changes:
        return {"available": False}

    avg_change = sum(changes) / len(changes)
    probability = 5_000 + max(-1_200, min(1_200, avg_change * 120))
    return {
        "available": True,
        "assets": ids[:4],
        "avg_24h_change_pct": avg_change,
        "probability_bps": _clamp_bps(probability),
        "confidence_bps": _clamp_bps(min(2_000, 700 + abs(avg_change) * 90)),
    }


@router.get("/market-probability")
async def market_probability_signal(
    market_id: str = Query(..., min_length=1),
    title: str = Query(..., min_length=1),
    description: str = "",
    category: str = "general",
) -> dict[str, Any]:
    text = f"{title} {description}"
    keyword_probability = _clamp_bps(5_000 + _keyword_delta_bps(text))
    components = {
        "keyword": {
            "available": True,
            "probability_bps": keyword_probability,
            "confidence_bps": 600,
        },
        "social": await _social_component(title, description),
        "crypto": await _crypto_component(title, description),
    }

    weighted = [(5_000, 400), (keyword_probability, 600)]
    for component in components.values():
        if component.get("available"):
            weighted.append(
                (
                    _clamp_bps(component.get("probability_bps") or 5_000),
                    _clamp_bps(component.get("confidence_bps") or 0),
                )
            )

    total_weight = sum(weight for _, weight in weighted)
    probability = sum(probability * weight for probability, weight in weighted) / max(total_weight, 1)
    confidence = max(weight for _, weight in weighted)
    confidence = max(confidence, abs(probability - 5_000) * 0.8)

    return {
        "source": "moltmarket-public-signals-v1",
        "market_id": market_id,
        "category": category,
        "probability_bps": _clamp_bps(probability),
        "confidence_bps": _clamp_bps(confidence),
        "components": components,
    }
