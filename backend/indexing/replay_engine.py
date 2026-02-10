# File: backend/indexing/replay_engine.py
"""
PURPOSE
-------
Deterministic event replay and state reconstruction engine.

This module:
- replays historical blockchain events
- reconstructs off-chain state from genesis or checkpoints
- guarantees idempotent processing
- is used for recovery, migrations, and audits

DESIGN RULES (from docs)
------------------------
- Replay must be deterministic
- No side effects outside persistence layer
- Idempotency is mandatory
- Event handlers are pure transformations
"""

from typing import Iterable, Dict, Any
import logging

from backend.indexing.event_handlers.market_events import MarketEventHandler
from backend.indexing.event_handlers.agent_events import AgentEventHandler
from backend.indexing.event_handlers.oracle_events import OracleEventHandler
from backend.indexing.event_handlers.yield_events import YieldEventHandler
from backend.indexing.event_handlers.rwa_events import RWAEventHandler
from backend.security.invariants import InvariantViolation

logger = logging.getLogger(__name__)


class ReplayEngine:
    """
    Replays blockchain events into off-chain state.
    """

    def __init__(self, events: Iterable[Dict[str, Any]]):
        """
        Args:
            events: iterable of raw blockchain events
        """
        self.events = events

    async def replay(self):
        """
        Replay all events in order.

        Invariants:
        - events must be strictly ordered
        - duplicate events must be ignored
        """

        logger.info("Starting replay of %d events", len(self.events))

        for event in self.events:
            try:
                await self._dispatch(event)
            except InvariantViolation as e:
                logger.error(
                    "Invariant violation during replay: %s | event=%s",
                    e.message,
                    event,
                )
                raise

        logger.info("Replay completed successfully")

    async def _dispatch(self, event: Dict[str, Any]):
        """
        Dispatch event to appropriate handler.
        """

        event_type = event.get("type")
        if not event_type:
            raise InvariantViolation("EVENT_TYPE_MISSING")

        if event_type.startswith("market."):
            await MarketEventHandler.handle(event)

        elif event_type.startswith("agent."):
            await AgentEventHandler.handle(event)

        elif event_type.startswith("oracle."):
            await OracleEventHandler.handle(event)

        elif event_type.startswith("yield."):
            await YieldEventHandler.handle(event)

        elif event_type.startswith("rwa."):
            await RWAEventHandler.handle(event)

        else:
            # Unknown events are ignored but logged
            logger.warning("Unknown event type: %s", event_type)
