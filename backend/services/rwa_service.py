# File: backend/services/rwa_service.py
"""
PURPOSE
-------
Service-layer implementation for Real-World Assets (RWA) and
outcome-token integrations.

This module:
- manages RWA token lifecycle (metadata, caps, visibility)
- bridges prediction outcomes into RWA / DeFi contexts
- coordinates cross-chain transfers via adapters
- NEVER custodies user funds
- NEVER bypasses governance bounds

DESIGN RULES (from docs)
------------------------
- RWAs are representations, not legal guarantees
- No redemption promises
- All mint/burn actions are governance-bounded
- Cross-chain actions are opt-in and replay-protected
- Deterministic behavior with full auditability
"""

from typing import Optional, Dict, Any

from backend.indexing.block_listener import ChainReader
from backend.persistence.repositories.rwa_repo import RWARepository
from backend.persistence.repositories.market_repo import MarketRepository
from backend.persistence.repositories.user_repo import UserRepository
from backend.security.invariants import InvariantViolation


class RWAService:
    # ------------------------------------------------------------------
    # REGISTRATION & METADATA
    # ------------------------------------------------------------------

    @staticmethod
    async def register_rwa(
        *,
        rwa_id: str,
        token_address: str,
        metadata_uri: str,
        max_supply: int,
        creator: str,
    ):
        """
        Register a new RWA token in the protocol index.

        Invariants:
        - rwa_id is unique
        - token_address is valid
        - metadata_uri provided
        - max_supply >= 0
        """

        if not rwa_id:
            raise InvariantViolation("INVALID_RWA_ID")

        if not token_address:
            raise InvariantViolation("INVALID_TOKEN_ADDRESS")

        if not metadata_uri:
            raise InvariantViolation("INVALID_METADATA_URI")

        if max_supply < 0:
            raise InvariantViolation("INVALID_MAX_SUPPLY")

        await UserRepository.ensure_exists(creator)

        existing = await RWARepository.get_by_rwa_id(rwa_id)
        if existing:
            raise InvariantViolation("RWA_ALREADY_REGISTERED")

        rwa = await RWARepository.create(
            rwa_id=rwa_id,
            token_address=token_address,
            metadata_uri=metadata_uri,
            max_supply=max_supply,
            creator=creator,
        )

        return rwa

    # ------------------------------------------------------------------
    # OUTCOME WRAPPING
    # ------------------------------------------------------------------

    @staticmethod
    async def wrap_market_outcome(
        *,
        market_id: str,
    ) -> Dict[str, Any]:
        """
        Wrap a finalized prediction market into outcome tokens.

        Invariants:
        - market exists
        - market is settled
        - wrapping has not already occurred
        """

        market = await MarketRepository.get_by_market_id(market_id)
        if not market:
            raise InvariantViolation("MARKET_NOT_FOUND")

        if not market.settled:
            raise InvariantViolation("MARKET_NOT_SETTLED")

        if market.outcome_wrapped:
            raise InvariantViolation("OUTCOME_ALREADY_WRAPPED")

        tx_hash = await ChainReader.wrap_outcome_on_chain(
            market_address=market.address,
        )
        receipt = await ChainReader.wait_for_tx(tx_hash)
        yes_token = None
        no_token = None
        for log in receipt.get("logs", []):
            if log.get("event") != "OutcomeWrapped":
                continue
            log_market = str(log.get("market", "")).lower()
            if log_market != str(market.address).lower():
                continue
            yes_token = log.get("yesToken") or log.get("yes_token")
            no_token = log.get("noToken") or log.get("no_token")
            break

        if not yes_token or not no_token:
            raise InvariantViolation("OUTCOME_WRAP_EVENT_MISSING")

        # ------------------------------------------------------------------
        # UPDATE OFF-CHAIN STATE
        # ------------------------------------------------------------------

        await MarketRepository.mark_outcome_wrapped(
            market_id=market_id,
            yes_token=yes_token,
            no_token=no_token,
        )

        return {
            "market_id": market_id,
            "yes_token": yes_token,
            "no_token": no_token,
        }

    # ------------------------------------------------------------------
    # CROSS-CHAIN TRANSFERS
    # ------------------------------------------------------------------

    @staticmethod
    async def initiate_cross_chain_transfer(
        *,
        user_address: str,
        token_address: str,
        amount: int,
        target_chain_id: int,
        target_address: bytes,
        bridge_address: str,
    ):
        """
        Initiate a cross-chain transfer of RWA or outcome tokens.

        Invariants:
        - user exists
        - amount > 0
        - target chain valid
        """

        if amount <= 0:
            raise InvariantViolation("INVALID_TRANSFER_AMOUNT")

        if target_chain_id <= 0:
            raise InvariantViolation("INVALID_TARGET_CHAIN")

        await UserRepository.ensure_exists(user_address)

        tx_hash = await ChainReader.initiate_cross_chain_transfer_on_chain(
            bridge_address=bridge_address,
            token_address=token_address,
            amount=amount,
            target_chain_id=target_chain_id,
            target_address=target_address,
        )
        receipt = await ChainReader.wait_for_tx(tx_hash)
        transfer_id = None
        for log in receipt.get("logs", []):
            if log.get("event") != "TransferInitiated":
                continue
            transfer_id = log.get("transferId") or log.get("transfer_id")
            if transfer_id:
                break
        if not transfer_id:
            raise InvariantViolation("CROSS_CHAIN_TRANSFER_EVENT_MISSING")

        return {
            "transfer_id": transfer_id,
            "user_address": user_address,
            "token_address": token_address,
            "amount": amount,
            "target_chain_id": target_chain_id,
            "target_address": target_address.hex(),
        }

    @staticmethod
    async def finalize_cross_chain_transfer(
        *,
        transfer_id: str,
        token_address: str,
        recipient: str,
        amount: int,
    ):
        """
        Finalize an incoming cross-chain transfer.

        NOTE:
        -----
        Callable only by approved bridge relayers (enforced on-chain).
        """

        if amount <= 0:
            raise InvariantViolation("INVALID_TRANSFER_AMOUNT")

        tx_hash = await ChainReader.finalize_cross_chain_transfer_on_chain(
            transfer_id=transfer_id,
            token_address=token_address,
            recipient=recipient,
            amount=amount,
        )
        await ChainReader.wait_for_tx(tx_hash)
        return True
