# File: backend/services/social_service.py
"""
PURPOSE
-------
Service-layer implementation for social-first market creation
and social signal ingestion.

This module:
- ingests social data (e.g., X / forums / feeds)
- extracts candidate market prompts
- validates & normalizes prompts
- triggers market creation workflows
- NEVER directly creates markets on-chain

DESIGN RULES (from docs)
------------------------
- Social data is advisory, never authoritative
- No blind auto-execution
- Deterministic prompt normalization
- All actions auditable and replayable
- Fail closed on ambiguity
"""

from typing import List, Dict, Any, Tuple
import hashlib
import json
import time

import httpx

from backend.core.config import settings
from backend.security.invariants import InvariantViolation
from backend.services.market_service import MarketService
from backend.persistence.repositories.social_repo import SocialRepository


def _extract_market_prompts(content: str) -> List[str]:
    """
    Deterministic prompt extraction from unstructured social text.
    """
    text = (content or "").strip()
    if not text:
        return []

    prompts: List[str] = []
    for part in text.replace("?", "?.").split("."):
        candidate = part.strip()
        if len(candidate) < 20:
            continue
        if "?" in candidate or candidate.lower().startswith(("will ", "can ", "is ", "are ")):
            prompts.append(candidate.rstrip("?") + "?")

    if prompts:
        return prompts[:5]

    # Fallback to full-content single prompt when no question-like chunks exist.
    return [text[:240]]


class SocialService:
    _MIN_MARKET_ELIGIBLE_BPS = 5500

    @staticmethod
    def heuristic_signal_score(
        *,
        content: str,
        metadata: Dict[str, Any] | None = None,
    ) -> Tuple[int, bool]:
        """
        Deterministic fallback scoring for social signal confidence.
        Returns (confidence_bps, market_eligible).
        """
        text = (content or "").strip().lower()
        meta = metadata or {}
        if not text:
            return 0, False

        score = 2500

        predictive_markers = (
            "will ",
            "would ",
            "expected",
            "forecast",
            "odds",
            "chance",
            "probability",
            "by ",
        )
        if "?" in text or any(marker in text for marker in predictive_markers):
            score += 1800

        market_markers = (
            "bitcoin",
            "btc",
            "eth",
            "ethereum",
            "sol",
            "rate",
            "inflation",
            "cpi",
            "fed",
            "election",
            "sec",
            "gdp",
            "jobs",
            "unemployment",
        )
        matches = sum(1 for marker in market_markers if marker in text)
        score += min(2200, matches * 400)

        digits = sum(ch.isdigit() for ch in text)
        if digits >= 3:
            score += 900

        social_velocity = int(meta.get("velocity", 0) or 0)
        social_volume = int(meta.get("volume", 0) or 0)
        score += min(1200, max(0, social_velocity // 10) + max(0, social_volume // 20))

        normalized = max(0, min(10_000, int(score)))
        return normalized, normalized >= SocialService._MIN_MARKET_ELIGIBLE_BPS

    @staticmethod
    async def score_event_signal(
        *,
        content: str,
        metadata: Dict[str, Any] | None = None,
    ) -> Tuple[int, bool]:
        """
        AI-first confidence scoring with deterministic fallback.
        """
        fallback_bps, fallback_eligible = SocialService.heuristic_signal_score(
            content=content,
            metadata=metadata,
        )
        if not settings.OPENAI_API_KEY:
            return fallback_bps, fallback_eligible

        prompt = (content or "").strip()
        if not prompt:
            return 0, False

        system = (
            "You score social posts for prediction-market usefulness. "
            "Return strict JSON: {\"confidence_bps\": int, \"market_eligible\": bool}. "
            "confidence_bps must be between 0 and 10000."
        )
        user_message = json.dumps(
            {
                "content": prompt,
                "metadata": metadata or {},
            }
        )
        payload = {
            "model": settings.AI_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0.0,
            "max_tokens": 80,
            "response_format": {"type": "json_object"},
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
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
                parsed = json.loads(raw)

            confidence_bps = int(parsed.get("confidence_bps", fallback_bps))
            market_eligible = bool(parsed.get("market_eligible", fallback_eligible))
            confidence_bps = max(0, min(10_000, confidence_bps))
            return confidence_bps, market_eligible
        except Exception:
            return fallback_bps, fallback_eligible

    # ------------------------------------------------------------------
    # INGESTION
    # ------------------------------------------------------------------

    @staticmethod
    async def ingest_event(
        *,
        source: str,
        external_id: str,
        author: str,
        content: str,
        timestamp: int,
        metadata: Dict[str, Any],
    ):
        """
        Ingest a raw social event.

        Invariants:
        - external_id uniqueness per source
        - timestamp sanity
        """

        if not source or not external_id:
            raise InvariantViolation("INVALID_SOCIAL_SOURCE")

        if timestamp <= 0 or timestamp > int(time.time()) + 60:
            raise InvariantViolation("INVALID_TIMESTAMP")

        # Deduplication
        exists = await SocialRepository.exists(source, external_id)
        if exists:
            return None

        event_id = SocialService._compute_event_id(
            source, external_id
        )

        signal_score_bps, market_eligible = await SocialService.score_event_signal(
            content=content,
            metadata=metadata,
        )

        return await SocialRepository.create_event(
            event_id=event_id,
            source=source,
            external_id=external_id,
            author=author,
            content=content,
            timestamp=timestamp,
            metadata=metadata,
            signal_score_bps=signal_score_bps,
            market_eligible=market_eligible,
        )

    # ------------------------------------------------------------------
    # PROMPT EXTRACTION
    # ------------------------------------------------------------------

    @staticmethod
    async def extract_and_stage_markets(event_id: str):
        """
        Extract candidate market prompts from a social event.

        Flow:
        - load event
        - run AI prompt extractor
        - normalize prompts
        - persist as staged (not live)
        """

        event = await SocialRepository.get_event(event_id)
        if not event:
            raise InvariantViolation("SOCIAL_EVENT_NOT_FOUND")

        prompts = _extract_market_prompts(event.content)

        if not prompts:
            return []

        staged = []
        for prompt in prompts:
            normalized = SocialService._normalize_prompt(prompt)

            staged_market = await SocialRepository.stage_market(
                event_id=event_id,
                prompt=normalized,
            )
            staged.append(staged_market)

        return staged

    # ------------------------------------------------------------------
    # MARKET CREATION (MANUAL / GOVERNED)
    # ------------------------------------------------------------------

    @staticmethod
    async def approve_and_create_market(
        *,
        staged_market_id: str,
        approver_address: str,
        start_time: int,
        end_time: int,
        max_exposure: int,
    ):
        """
        Approve a staged market prompt and trigger creation.

        NOTE:
        -----
        This requires explicit approval (governance or trusted role).
        """

        staged = await SocialRepository.get_staged_market(
            staged_market_id
        )
        if not staged:
            raise InvariantViolation("STAGED_MARKET_NOT_FOUND")

        # Generate deterministic market_id from prompt
        market_id = hashlib.sha256(
            staged.prompt.encode()
        ).hexdigest()

        return await MarketService.create_market(
            creator=approver_address,
            market_id=market_id,
            start_time=start_time,
            end_time=end_time,
            max_exposure=max_exposure,
            metadata_uri=staged.prompt,
        )

    # ------------------------------------------------------------------
    # HELPERS
    # ------------------------------------------------------------------

    @staticmethod
    def _compute_event_id(source: str, external_id: str) -> str:
        return hashlib.sha256(
            f"{source}:{external_id}".encode()
        ).hexdigest()

    @staticmethod
    def _normalize_prompt(prompt: str) -> str:
        """
        Normalize prompt text to ensure determinism.
        """
        return " ".join(prompt.strip().lower().split())
