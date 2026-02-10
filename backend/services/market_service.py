# File: backend/services/market_service.py
"""
PURPOSE
-------
Service-layer implementation for prediction markets.

This module:
- contains ALL business logic for markets
- coordinates blockchain interactions, persistence, and indexing
- enforces protocol invariants defined in docs
- is the single source of truth for market state off-chain

DESIGN RULES (from docs)
------------------------
- No HTTP / FastAPI code here
- No direct request parsing
- Deterministic behavior
- Explicit invariant enforcement
- Fail closed on any inconsistency
"""

from typing import List, Optional
import time

from backend.persistence.repositories.market_repo import MarketRepository
from backend.persistence.repositories.user_repo import UserRepository
from backend.security.invariants import InvariantViolation
from backend.indexing.block_listener import ChainReader
from backend.indexing.event_handlers.market_events import MarketEventParser


class MarketService:
    # ------------------------------------------------------------------
    # CREATION
    # ------------------------------------------------------------------

    @staticmethod
    async def create_market(
        *,
        creator: str,
        market_id: str,
        start_time: int,
        end_time: int,
        max_exposure: int,
        metadata_uri: str,
    ):
        """
        Create a new prediction market.

        Invariants enforced here (from docs):
        - start_time < end_time
        - start_time is in the future
        - max_exposure > 0
        - market_id uniqueness
        """

        now = int(time.time())

        if start_time <= now:
            raise InvariantViolation("START_TIME_IN_PAST")

        if end_time <= start_time:
            raise InvariantViolation("INVALID_TIME_RANGE")

        if max_exposure <= 0:
            raise InvariantViolation("INVALID_MAX_EXPOSURE")

        # Ensure creator exists (user auto-created on first use)
        await UserRepository.ensure_exists(creator)

        # Enforce uniqueness
        existing = await MarketRepository.get_by_market_id(market_id)
        if existing:
            raise InvariantViolation("MARKET_ID_ALREADY_EXISTS")

        # ------------------------------------------------------------------
        # ON-CHAIN MARKET CREATION
        # ------------------------------------------------------------------

        """
        NOTE:
        -----
        Actual transaction submission is abstracted behind ChainReader.
        This keeps service logic chain-agnostic and testable.
        """

        tx_hash = await ChainReader.create_market_on_chain(
            creator=creator,
            market_id=market_id,
            start_time=start_time,
            end_time=end_time,
            max_exposure=max_exposure,
            metadata_uri=metadata_uri,
        )

        # ------------------------------------------------------------------
        # WAIT FOR CONFIRMATION & PARSE EVENTS
        # ------------------------------------------------------------------

        receipt = await ChainReader.wait_for_tx(tx_hash)

        market_address = MarketEventParser.extract_market_address(receipt)
        if not market_address:
            raise InvariantViolation("MARKET_CREATION_FAILED")

        # ------------------------------------------------------------------
        # PERSIST OFF-CHAIN STATE
        # ------------------------------------------------------------------

        market = await MarketRepository.create(
            market_id=market_id,
            address=market_address,
            creator=creator,
            start_time=start_time,
            end_time=end_time,
            max_exposure=max_exposure,
            metadata_uri=metadata_uri,
            settled=False,
            final_outcome=None,
        )

        return market

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    @staticmethod
    async def get_market(market_id: str):
        """
        Fetch a single market by market_id.
        """
        return await MarketRepository.get_by_market_id(market_id)

    @staticmethod
    async def list_markets(limit: int, offset: int):
        """
        Paginated list of markets.
        """
        return await MarketRepository.list(limit=limit, offset=offset)

    # ------------------------------------------------------------------
    # SETTLEMENT
    # ------------------------------------------------------------------

    @staticmethod
    async def settle_market(
        *,
        market_id: str,
        outcome: bool,
        caller: str,
    ):
        """
        Trigger settlement for a market.

        Invariants enforced:
        - market exists
        - market not already settled
        - caller has settlement authority (oracle consensus / governance)
        """

        market = await MarketRepository.get_by_market_id(market_id)
        if not market:
            raise InvariantViolation("MARKET_NOT_FOUND")

        if market.settled:
            raise InvariantViolation("MARKET_ALREADY_SETTLED")

        # Authorization check (abstracted)
        authorized = await UserRepository.is_governance(caller)
        if not authorized:
            raise InvariantViolation("UNAUTHORIZED_SETTLEMENT")

        # ------------------------------------------------------------------
        # ON-CHAIN SETTLEMENT
        # ------------------------------------------------------------------

        tx_hash = await ChainReader.settle_market_on_chain(
            market_address=market.address,
            outcome=outcome,
            caller=caller,
        )

        receipt = await ChainReader.wait_for_tx(tx_hash)

        settled_outcome = MarketEventParser.extract_final_outcome(receipt)
        if settled_outcome is None:
            raise InvariantViolation("SETTLEMENT_FAILED")

        # ------------------------------------------------------------------
        # UPDATE OFF-CHAIN STATE
        # ------------------------------------------------------------------

        await MarketRepository.mark_settled(
            market_id=market_id,
            final_outcome=settled_outcome,
        )

        return True
