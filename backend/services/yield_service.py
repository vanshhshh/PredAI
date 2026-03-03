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
from typing import List, Any

from backend.persistence.repositories.yield_repo import YieldRepository
from backend.persistence.repositories.user_repo import UserRepository
from backend.security.invariants import InvariantViolation
from backend.services.ai_client import AIClient



class YieldService:
    @staticmethod
    def _normalize_recommendation(recommendation: Any):
        if isinstance(recommendation, dict):
            allocation = recommendation.get("allocation")
            if isinstance(allocation, list):
                return allocation
            return []
        if isinstance(recommendation, list):
            return recommendation
        return []

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
        

        allocation = YieldService._normalize_recommendation(recommendation)
        if not allocation:
            raise InvariantViolation("REBALANCE_FAILED")

        normalized_positions = []
        for item in allocation:
            vault_id = str(item.get("vault_id", "")).strip()
            if not vault_id:
                continue

            recommended_amount = item.get("recommended_amount", item.get("amount", 0))
            normalized_positions.append(
                {
                    "vault_id": vault_id,
                    "amount": max(0, int(float(recommended_amount))),
                    "apy_bps": max(0, int(item.get("apy_bps", 0))),
                    "risk_score": max(0, int(item.get("risk_score", target_risk_score))),
                }
            )

        if not normalized_positions:
            raise InvariantViolation("NO_VALID_ALLOCATION")

        await YieldRepository.apply_rebalance(
            user_address=user_address,
            new_positions=normalized_positions,
        )

        return True
