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

from typing import Dict, List, Optional, Tuple
import time

from backend.indexing.block_listener import ChainReader
from backend.indexing.event_handlers.market_events import MarketEventParser
from backend.persistence.repositories.market_repo import MarketRepository
from backend.persistence.repositories.user_repo import UserRepository
from backend.security.invariants import InvariantViolation


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

        tx_hash = await ChainReader.create_market_on_chain(
            creator=creator,
            market_id=market_id,
            start_time=start_time,
            end_time=end_time,
            max_exposure=max_exposure,
            metadata_uri=metadata_uri,
        )
        receipt = await ChainReader.wait_for_tx(tx_hash)
        market_address = MarketEventParser.extract_market_address(receipt)
        if not market_address:
            raise InvariantViolation("MARKET_CREATE_EVENT_MISSING")

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

    @staticmethod
    async def get_market_pools(market_id: str) -> Tuple[int, int]:
        """
        Return cumulative YES/NO pools from persisted bets.
        """
        return await MarketRepository.get_market_pools(market_id)

    @staticmethod
    async def get_markets_pools(market_ids: List[str]) -> Dict[str, Tuple[int, int]]:
        """
        Return cumulative YES/NO pools keyed by market_id.
        """
        return await MarketRepository.get_markets_pools(market_ids)

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

        tx_hash = await ChainReader.settle_market_on_chain(
            market_address=market.address,
            outcome=outcome,
            caller=caller,
        )
        receipt = await ChainReader.wait_for_tx(tx_hash)
        final_outcome = MarketEventParser.extract_final_outcome(receipt)
        if final_outcome is None:
            final_outcome = outcome

        await MarketRepository.mark_settled(
            market_id=market_id,
            final_outcome=bool(final_outcome),
        )

        return True

    @staticmethod
    async def place_bet(
        *,
        user_address: str,
        market_id: str,
        side: str,
        amount: int,
        tx_hash: str,
    ):
        """
        Place a YES/NO bet in a live market.
        """
        if amount <= 0:
            raise InvariantViolation("INVALID_BET_AMOUNT")

        normalized_side = side.upper().strip()
        if normalized_side not in {"YES", "NO"}:
            raise InvariantViolation("INVALID_BET_SIDE")

        market = await MarketRepository.get_by_market_id(market_id)
        if not market:
            raise InvariantViolation("MARKET_NOT_FOUND")

        if market.settled:
            raise InvariantViolation("MARKET_ALREADY_SETTLED")

        now = int(time.time())
        if now < int(market.start_time):
            raise InvariantViolation("MARKET_NOT_STARTED")
        if now >= int(market.end_time):
            raise InvariantViolation("MARKET_CLOSED")

        exposure = await MarketRepository.get_market_exposure(market_id)
        if exposure + amount > int(market.max_exposure):
            raise InvariantViolation("MAX_EXPOSURE_EXCEEDED")

        if not tx_hash:
            raise InvariantViolation("BET_TX_HASH_REQUIRED")

        await ChainReader.verify_market_bet_tx(
            tx_hash=tx_hash,
            user_address=user_address,
            market_address=market.address,
            side=normalized_side,
            amount=amount,
        )

        await UserRepository.ensure_exists(user_address)

        return await MarketRepository.place_bet(
            user_address=user_address,
            market_id=market_id,
            side=normalized_side,
            amount=amount,
        )
