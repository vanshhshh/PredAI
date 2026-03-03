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

from backend.indexing.block_listener import ChainReader
from backend.persistence.repositories.market_repo import MarketRepository
from backend.persistence.repositories.oracle_repo import OracleRepository
from backend.persistence.repositories.user_repo import UserRepository
from backend.security.invariants import InvariantViolation


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
        tx_hash: str,
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

        if not tx_hash:
            raise InvariantViolation("ORACLE_REGISTER_TX_HASH_REQUIRED")

        await ChainReader.verify_oracle_registration_tx(
            tx_hash=tx_hash,
            oracle_address=oracle_address,
            oracle_id=oracle_id,
            metadata_uri=metadata_uri,
        )

        # Persist initial off-chain state
        oracle = await OracleRepository.create(
            oracle_id=oracle_id,
            address=oracle_address,
            metadata_uri=metadata_uri,
            active=False,
            stake=0,
        )

        return oracle

    # ------------------------------------------------------------------
    # STAKING
    # ------------------------------------------------------------------

    @staticmethod
    async def stake(
        *,
        oracle_address: str,
        amount: int,
        tx_hash: str,
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

        if not tx_hash:
            raise InvariantViolation("ORACLE_STAKE_TX_HASH_REQUIRED")

        await ChainReader.verify_oracle_stake_tx(
            tx_hash=tx_hash,
            oracle_address=oracle_address,
            amount=amount,
        )

        updated = await OracleRepository.update_stake(
            oracle_address=oracle_address,
            stake=int(oracle.stake) + amount,
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
        tx_hash: str,
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

        market = await MarketRepository.get_by_market_id(market_id)
        if not market:
            raise InvariantViolation("MARKET_NOT_FOUND")

        if not tx_hash:
            raise InvariantViolation("ORACLE_SUBMIT_TX_HASH_REQUIRED")

        await ChainReader.verify_oracle_submission_tx(
            tx_hash=tx_hash,
            oracle_address=oracle_address,
            market_address=market.address,
            outcome=outcome,
        )

        await OracleRepository.record_submission(
            oracle_address=oracle_address,
            market_id=market_id,
            outcome=outcome,
        )

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
