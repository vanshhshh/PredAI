# File: backend/indexing/event_handlers/market_events.py
"""
PURPOSE
-------
Event handler for prediction market–related blockchain events.

This module:
- processes market lifecycle events
- updates off-chain state deterministically
- is used by ReplayEngine and live indexers
- NEVER performs chain calls
- NEVER performs business decisions

DESIGN RULES (from docs)
------------------------
- Handlers must be idempotent
- Event processing must be deterministic
- No cross-entity side effects
- Fail closed on malformed events
"""

from typing import Dict, Any

from backend.persistence.repositories.market_repo import MarketRepository
from backend.security.invariants import InvariantViolation


class MarketEventParser:
    """
    Lightweight parser helpers used by services.
    """

    @staticmethod
    def extract_market_address(receipt: Dict[str, Any]) -> str | None:
        """
        Extract market address from transaction receipt.
        """
        for log in receipt.get("logs", []):
            if log.get("event") == "MarketCreated":
                return log.get("market")
        return None

    @staticmethod
    def extract_final_outcome(receipt: Dict[str, Any]) -> bool | None:
        """
        Extract final outcome from settlement receipt.
        """
        for log in receipt.get("logs", []):
            if log.get("event") == "MarketSettled":
                return log.get("outcome")
        return None


class MarketEventHandler:
    """
    Deterministic handler for market events.
    """

    @staticmethod
    async def handle(event: Dict[str, Any]):
        event_type = event.get("type")

        if event_type == "market.created":
            await MarketEventHandler._handle_created(event)
        elif event_type == "market.settled":
            await MarketEventHandler._handle_settled(event)
        else:
            # Unknown market events are ignored safely
            return

    @staticmethod
    async def _handle_created(event: Dict[str, Any]):
        """
        Handle market creation event.
        """
        market_id = event.get("market_id")
        address = event.get("address")

        if not market_id or not address:
            raise InvariantViolation("MALFORMED_MARKET_CREATED_EVENT")

        exists = await MarketRepository.get_by_market_id(market_id)
        if exists:
            # Idempotency: ignore duplicates
            return

        await MarketRepository.create_from_event(
            market_id=market_id,
            address=address,
            creator=event.get("creator"),
            start_time=event.get("start_time"),
            end_time=event.get("end_time"),
            max_exposure=event.get("max_exposure"),
            metadata_uri=event.get("metadata_uri"),
        )

    @staticmethod
    async def _handle_settled(event: Dict[str, Any]):
        """
        Handle market settlement event.
        """
        market_id = event.get("market_id")
        outcome = event.get("outcome")

        if market_id is None or outcome is None:
            raise InvariantViolation("MALFORMED_MARKET_SETTLED_EVENT")

        market = await MarketRepository.get_by_market_id(market_id)
        if not market:
            raise InvariantViolation("SETTLED_MARKET_NOT_FOUND")

        if market.settled:
            # Idempotency
            return

        await MarketRepository.mark_settled(
            market_id=market_id,
            final_outcome=outcome,
        )
