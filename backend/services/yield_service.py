# File: backend/services/yield_service.py
"""
PURPOSE
-------
Service-layer implementation for the yield ecosystem.

This module:
- aggregates vault & strategy data
- computes user portfolios
- coordinates AI-assisted rebalancing
- enforces RiskAllocator constraints
- triggers on-chain routing via CapitalRouter

DESIGN RULES (from docs)
------------------------
- No HTTP logic here
- No direct DB session management
- Deterministic decisions given same inputs
- Fail closed on risk violations
- Chain interactions abstracted
"""

from typing import List

from backend.persistence.repositories.yield_repo import YieldRepository
from backend.persistence.repositories.user_repo import UserRepository
from backend.security.invariants import InvariantViolation
from backend.indexing.block_listener import ChainReader
from backend.indexing.event_handlers.yield_events import YieldEventParser
from backend.services.ai_client import AIClient



class YieldService:
    # ------------------------------------------------------------------
    # VAULT DISCOVERY
    # ------------------------------------------------------------------

    @staticmethod
    async def list_vaults():
        """
        List all active yield vaults with live metrics.
        """
        return await YieldRepository.list_active_vaults()

    # ------------------------------------------------------------------
    # PORTFOLIO
    # ------------------------------------------------------------------

    @staticmethod
    async def get_portfolio(user_address: str):
        """
        Compute a user's current yield portfolio.

        Invariants:
        - user exists
        """

        await UserRepository.ensure_exists(user_address)

        positions = await YieldRepository.get_positions_by_user(user_address)

        total_value = sum(p.amount for p in positions)

        return {
            "total_value": total_value,
            "positions": [
                {
                    "vault_id": p.vault_id,
                    "amount": p.amount,
                    "apy_bps": p.apy_bps,
                    "risk_score": p.risk_score,
                }
                for p in positions
            ],
        }

    # ------------------------------------------------------------------
    # REBALANCING
    # ------------------------------------------------------------------

    @staticmethod
    async def rebalance(
        *,
        user_address: str,
        target_risk_score: int,
    ):
        """
        Trigger AI-assisted portfolio rebalancing.

        Flow:
        - fetch current portfolio
        - compute target allocation using AI model
        - validate against RiskAllocator constraints
        - execute routing on-chain
        """

        await UserRepository.ensure_exists(user_address)

        if target_risk_score <= 0:
            raise InvariantViolation("INVALID_TARGET_RISK")

        current_positions = await YieldRepository.get_positions_by_user(
            user_address
        )

        # AI recommendation (pure function given inputs)
        recommendation = await AIClient.recommend_allocation(
            positions=current_positions,
            target_risk_score=target_risk_score,
        )



        if not recommendation:
            raise InvariantViolation("NO_VALID_ALLOCATION")

        # ------------------------------------------------------------------
        # EXECUTE ROUTING ON-CHAIN
        # ------------------------------------------------------------------

        tx_hash = await ChainReader.execute_rebalance_on_chain(
            user_address=user_address,
            allocation=recommendation,
        )

        receipt = await ChainReader.wait_for_tx(tx_hash)

        parsed = YieldEventParser.parse_rebalance(receipt)
        if not parsed:
            raise InvariantViolation("REBALANCE_FAILED")

        # ------------------------------------------------------------------
        # UPDATE OFF-CHAIN STATE
        # ------------------------------------------------------------------

        await YieldRepository.apply_rebalance(
            user_address=user_address,
            new_positions=parsed.positions,
        )

        return True
