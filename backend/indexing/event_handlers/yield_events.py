# File: backend/indexing/event_handlers/yield_events.py
"""
PURPOSE
-------
Event handler for yield- and vault-related blockchain events.

This module:
- processes deposits, withdrawals, and rebalances
- updates off-chain yield state deterministically
- is used by ReplayEngine and live indexers
- NEVER performs chain calls
- NEVER makes portfolio decisions

DESIGN RULES (from docs)
------------------------
- Idempotent processing
- Deterministic updates
- No implicit assumptions about strategy correctness
- Fail closed on malformed events
"""

from typing import Dict, Any, List

from backend.persistence.repositories.yield_repo import YieldRepository
from backend.security.invariants import InvariantViolation


class YieldEventParser:
    """
    Helpers used by services to parse receipts.
    """

    @staticmethod
    def parse_rebalance(receipt: Dict[str, Any]) -> Dict[str, Any] | None:
        """
        Parse rebalance receipt and extract new positions.
        """
        positions: List[Dict[str, Any]] = []

        for log in receipt.get("logs", []):
            if log.get("event") == "VaultPositionUpdated":
                positions.append(
                    {
                        "vault_id": log.get("vault_id"),
                        "amount": log.get("amount"),
                        "apy_bps": log.get("apy_bps"),
                        "risk_score": log.get("risk_score"),
                    }
                )

        if not positions:
            return None

        return {"positions": positions}


class YieldEventHandler:
    """
    Deterministic handler for yield events.
    """

    @staticmethod
    async def handle(event: Dict[str, Any]):
        event_type = event.get("type")

        if event_type == "yield.deposited":
            await YieldEventHandler._handle_deposited(event)
        elif event_type == "yield.withdrawn":
            await YieldEventHandler._handle_withdrawn(event)
        elif event_type == "yield.rebalanced":
            await YieldEventHandler._handle_rebalanced(event)
        else:
            return

    # --------------------------------------------------------------
    # HANDLERS
    # --------------------------------------------------------------

    @staticmethod
    async def _handle_deposited(event: Dict[str, Any]):
        user = event.get("user")
        vault_id = event.get("vault_id")
        amount = event.get("amount")

        if not user or not vault_id or amount is None:
            raise InvariantViolation("MALFORMED_YIELD_DEPOSIT_EVENT")

        await YieldRepository.record_deposit(
            user_address=user,
            vault_id=vault_id,
            amount=amount,
        )

    @staticmethod
    async def _handle_withdrawn(event: Dict[str, Any]):
        user = event.get("user")
        vault_id = event.get("vault_id")
        amount = event.get("amount")

        if not user or not vault_id or amount is None:
            raise InvariantViolation("MALFORMED_YIELD_WITHDRAW_EVENT")

        await YieldRepository.record_withdrawal(
            user_address=user,
            vault_id=vault_id,
            amount=amount,
        )

    @staticmethod
    async def _handle_rebalanced(event: Dict[str, Any]):
        user = event.get("user")
        positions = event.get("positions")

        if not user or not isinstance(positions, list):
            raise InvariantViolation("MALFORMED_YIELD_REBALANCE_EVENT")

        await YieldRepository.apply_rebalance(
            user_address=user,
            new_positions=positions,
        )
