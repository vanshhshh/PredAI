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

from typing import List, Dict, Any
import hashlib
import time

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

        return await SocialRepository.create_event(
            event_id=event_id,
            source=source,
            external_id=external_id,
            author=author,
            content=content,
            timestamp=timestamp,
            metadata=metadata,
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
