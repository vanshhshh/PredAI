# File: backend/indexing/event_handlers/oracle_events.py
"""
PURPOSE
-------
Event handler for oracle-related blockchain events.

This module:
- processes oracle lifecycle events (register, stake, submit)
- updates off-chain oracle state deterministically
- feeds downstream consensus/slashing pipelines
- NEVER performs chain calls
- NEVER performs scoring or resolution logic

DESIGN RULES (from docs)
------------------------
- Idempotent event handling
- Deterministic state transitions
- No implicit authority assumptions
- Fail closed on malformed or contradictory events
"""

from typing import Dict, Any

from backend.persistence.repositories.oracle_repo import OracleRepository
from backend.security.invariants import InvariantViolation


class OracleEventParser:
    """
    Helpers used by services to verify on-chain receipts.
    """

    @staticmethod
    def verify_registration(receipt: Dict[str, Any], oracle_id: str) -> bool:
        for log in receipt.get("logs", []):
            logged_id = log.get("oracle_id") or log.get("oracleId")
            if (
                log.get("event") == "OracleRegistered"
                and logged_id is not None
                and str(logged_id).lower() == str(oracle_id).lower()
            ):
                return True
        return False

    @staticmethod
    def parse_stake(receipt: Dict[str, Any]) -> Dict[str, Any] | None:
        for log in receipt.get("logs", []):
            if log.get("event") in {"OracleStaked", "StakeDeposited"}:
                return {
                    "stake": log.get("stake") or log.get("amount"),
                }
        return None

    @staticmethod
    def verify_submission(receipt: Dict[str, Any], market_id: str) -> bool:
        for log in receipt.get("logs", []):
            submitted_market = log.get("market_id") or log.get("marketId") or log.get("market")
            if (
                log.get("event") == "OracleSubmitted"
                and submitted_market is not None
                and str(submitted_market).lower() == str(market_id).lower()
            ):
                return True
        return False


class OracleEventHandler:
    """
    Deterministic handler for oracle events.
    """

    @staticmethod
    async def handle(event: Dict[str, Any]):
        event_type = event.get("type")

        if event_type == "oracle.registered":
            await OracleEventHandler._handle_registered(event)
        elif event_type == "oracle.staked":
            await OracleEventHandler._handle_staked(event)
        elif event_type == "oracle.submitted":
            await OracleEventHandler._handle_submitted(event)
        else:
            return

    # --------------------------------------------------------------
    # HANDLERS
    # --------------------------------------------------------------

    @staticmethod
    async def _handle_registered(event: Dict[str, Any]):
        oracle_id = event.get("oracle_id")
        address = event.get("address")
        metadata_uri = event.get("metadata_uri")

        if not oracle_id or not address:
            raise InvariantViolation("MALFORMED_ORACLE_REGISTERED_EVENT")

        exists = await OracleRepository.get_by_oracle_id(oracle_id)
        if exists:
            return  # idempotent

        await OracleRepository.create_from_event(
            oracle_id=oracle_id,
            address=address,
            metadata_uri=metadata_uri,
        )

    @staticmethod
    async def _handle_staked(event: Dict[str, Any]):
        address = event.get("address")
        stake = event.get("stake")

        if not address or stake is None:
            raise InvariantViolation("MALFORMED_ORACLE_STAKED_EVENT")

        oracle = await OracleRepository.get_by_address(address)
        if not oracle:
            raise InvariantViolation("ORACLE_NOT_FOUND")

        await OracleRepository.update_stake(
            oracle_address=address,
            stake=stake,
            active=True,
        )

    @staticmethod
    async def _handle_submitted(event: Dict[str, Any]):
        """
        Handle oracle submission event.

        NOTE:
        -----
        This does NOT resolve markets.
        It only records that a submission occurred.
        """
        address = event.get("address")
        market_id = event.get("market_id")
        outcome = event.get("outcome")

        if not address or not market_id or outcome is None:
            raise InvariantViolation("MALFORMED_ORACLE_SUBMISSION_EVENT")

        oracle = await OracleRepository.get_by_address(address)
        if not oracle:
            raise InvariantViolation("ORACLE_NOT_FOUND")

        await OracleRepository.record_submission(
            oracle_address=address,
            market_id=market_id,
            outcome=outcome,
        )
