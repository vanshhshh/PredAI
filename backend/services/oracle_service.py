# File: backend/services/oracle_service.py
"""
PURPOSE
-------
Service-layer implementation for oracle participants.

This module:
- enforces oracle lifecycle invariants
- coordinates on-chain staking and submissions
- persists oracle state off-chain
- triggers downstream consensus & slashing flows

DESIGN RULES (from docs)
------------------------
- No HTTP / FastAPI logic here
- Deterministic behavior
- Explicit invariant enforcement
- Chain interactions abstracted via ChainReader
- Consensus & slashing are NOT decided here
"""

from typing import List

from backend.persistence.repositories.oracle_repo import OracleRepository
from backend.persistence.repositories.user_repo import UserRepository
from backend.security.invariants import InvariantViolation
from backend.indexing.block_listener import ChainReader
from backend.indexing.event_handlers.oracle_events import OracleEventParser


class OracleService:
    # ------------------------------------------------------------------
    # REGISTRATION
    # ------------------------------------------------------------------

    @staticmethod
    async def register_oracle(
        *,
        oracle_address: str,
        oracle_id: str,
        metadata_uri: str,
    ):
        """
        Register a new oracle identity.

        Invariants:
        - oracle_id is unique
        - metadata_uri provided
        - oracle not already registered
        """

        if not oracle_id:
            raise InvariantViolation("INVALID_ORACLE_ID")

        if not metadata_uri:
            raise InvariantViolation("INVALID_METADATA_URI")

        await UserRepository.ensure_exists(oracle_address)

        existing = await OracleRepository.get_by_oracle_id(oracle_id)
        if existing:
            raise InvariantViolation("ORACLE_ID_ALREADY_EXISTS")

        # Persist initial off-chain state
        oracle = await OracleRepository.create(
            oracle_id=oracle_id,
            address=oracle_address,
            metadata_uri=metadata_uri,
            active=False,
            stake=0,
        )

        # On-chain registration
        tx_hash = await ChainReader.register_oracle_on_chain(
            oracle_address=oracle_address,
            oracle_id=oracle_id,
            metadata_uri=metadata_uri,
        )
        receipt = await ChainReader.wait_for_tx(tx_hash)

        if not OracleEventParser.verify_registration(receipt, oracle_id):
            raise InvariantViolation("ORACLE_ONCHAIN_REGISTRATION_FAILED")

        return oracle

    # ------------------------------------------------------------------
    # STAKING
    # ------------------------------------------------------------------

    @staticmethod
    async def stake(
        *,
        oracle_address: str,
        amount: int,
    ):
        """
        Stake capital as an oracle.

        Invariants:
        - oracle exists
        - amount > 0
        """

        if amount <= 0:
            raise InvariantViolation("INVALID_STAKE_AMOUNT")

        oracle = await OracleRepository.get_by_address(oracle_address)
        if not oracle:
            raise InvariantViolation("ORACLE_NOT_FOUND")

        tx_hash = await ChainReader.stake_oracle_on_chain(
            oracle_address=oracle_address,
            amount=amount,
        )
        receipt = await ChainReader.wait_for_tx(tx_hash)

        parsed = OracleEventParser.parse_stake(receipt)
        if not parsed:
            raise InvariantViolation("ORACLE_STAKE_FAILED")

        updated = await OracleRepository.update_stake(
            oracle_address=oracle_address,
            stake=parsed.stake,
            active=True,
        )

        return updated

    # ------------------------------------------------------------------
    # SUBMISSION
    # ------------------------------------------------------------------

    @staticmethod
    async def submit_outcome(
        *,
        oracle_address: str,
        market_id: str,
        outcome: bool,
    ):
        """
        Submit an outcome for a market.

        Invariants:
        - oracle exists & is active
        - market exists (checked on-chain)
        """

        oracle = await OracleRepository.get_by_address(oracle_address)
        if not oracle:
            raise InvariantViolation("ORACLE_NOT_FOUND")

        if not oracle.active:
            raise InvariantViolation("ORACLE_INACTIVE")

        tx_hash = await ChainReader.submit_oracle_outcome_on_chain(
            oracle_address=oracle_address,
            market_id=market_id,
            outcome=outcome,
        )
        receipt = await ChainReader.wait_for_tx(tx_hash)

        if not OracleEventParser.verify_submission(receipt, market_id):
            raise InvariantViolation("ORACLE_SUBMISSION_FAILED")

        # NOTE:
        # Consensus, weighting, and slashing are triggered asynchronously
        return True

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    @staticmethod
    async def get_oracle(oracle_id: str):
        """
        Fetch oracle by oracle_id.
        """
        return await OracleRepository.get_by_oracle_id(oracle_id)

    @staticmethod
    async def list_oracles(limit: int, offset: int):
        """
        Paginated list of oracles.
        """
        return await OracleRepository.list(limit=limit, offset=offset)
