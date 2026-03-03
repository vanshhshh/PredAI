# File: backend/services/agent_service.py
"""
PURPOSE
-------
Service-layer implementation for AI agents.

This module:
- enforces all agent lifecycle invariants
- coordinates on-chain staking / activation
- persists agent state off-chain
- computes and updates agent scores via scoring engine

DESIGN RULES
------------
- No HTTP logic here
- No FastAPI dependencies
- Deterministic state transitions
- Explicit invariant enforcement
- Chain interactions abstracted
"""

from typing import Optional, List

from backend.indexing.block_listener import ChainReader
from backend.persistence.repositories.agent_repo import AgentRepository
from backend.persistence.repositories.user_repo import UserRepository
from backend.security.invariants import InvariantViolation
from backend.services.scoring_client import score_agent


class AgentService:
    # ------------------------------------------------------------------
    # REGISTRATION
    # ------------------------------------------------------------------

    @staticmethod
    async def register_agent(
        *,
        owner_address: str,
        agent_id: str,
        metadata_uri: str,
        tx_hash: str,
    ):
        """
        Register a new agent.

        Invariants:
        - agent_id is unique
        - owner exists
        - metadata_uri provided
        """

        if not agent_id:
            raise InvariantViolation("INVALID_AGENT_ID")

        if not metadata_uri:
            raise InvariantViolation("INVALID_METADATA_URI")

        await UserRepository.ensure_exists(owner_address)

        existing = await AgentRepository.get_by_agent_id(agent_id)
        if existing:
            raise InvariantViolation("AGENT_ID_ALREADY_EXISTS")

        if not tx_hash:
            raise InvariantViolation("AGENT_REGISTER_TX_HASH_REQUIRED")

        await ChainReader.verify_agent_registration_tx(
            tx_hash=tx_hash,
            owner=owner_address,
            agent_id=agent_id,
            metadata_uri=metadata_uri,
        )

        # Persist initial off-chain state
        agent = await AgentRepository.create(
            agent_id=agent_id,
            owner=owner_address,
            metadata_uri=metadata_uri,
            active=False,
            stake=0,
            score=0,
        )

        return agent

    # ------------------------------------------------------------------
    # STAKING & ACTIVATION
    # ------------------------------------------------------------------

    @staticmethod
    async def stake_and_activate(
        *,
        owner_address: str,
        agent_id: str,
        amount: int,
        tx_hash: str,
    ):
        """
        Stake capital and activate an agent.

        Invariants:
        - agent exists
        - caller is owner
        - amount > 0
        - agent not already active
        """

        if amount <= 0:
            raise InvariantViolation("INVALID_STAKE_AMOUNT")

        agent = await AgentRepository.get_by_agent_id(agent_id)
        if not agent:
            raise InvariantViolation("AGENT_NOT_FOUND")

        if agent.owner != owner_address:
            raise InvariantViolation("NOT_AGENT_OWNER")

        if agent.active:
            raise InvariantViolation("AGENT_ALREADY_ACTIVE")

        if not tx_hash:
            raise InvariantViolation("AGENT_STAKE_TX_HASH_REQUIRED")

        await ChainReader.verify_agent_stake_activate_tx(
            tx_hash=tx_hash,
            owner=owner_address,
            amount=amount,
        )

        updated = await AgentRepository.activate(
            agent_id=agent_id,
            stake=int(agent.stake) + amount,
        )

        return updated

    # ------------------------------------------------------------------
    # DEACTIVATION
    # ------------------------------------------------------------------

    @staticmethod
    async def deactivate_agent(
        *,
        owner_address: str,
        agent_id: str,
        tx_hash: str,
    ):
        """
        Deactivate an agent.

        Invariants:
        - agent exists
        - caller is owner
        - agent is active
        """

        agent = await AgentRepository.get_by_agent_id(agent_id)
        if not agent:
            raise InvariantViolation("AGENT_NOT_FOUND")

        if agent.owner != owner_address:
            raise InvariantViolation("NOT_AGENT_OWNER")

        if not agent.active:
            raise InvariantViolation("AGENT_ALREADY_INACTIVE")

        if not tx_hash:
            raise InvariantViolation("AGENT_DEACTIVATE_TX_HASH_REQUIRED")

        await ChainReader.verify_agent_deactivate_tx(
            tx_hash=tx_hash,
            owner=owner_address,
        )

        return await AgentRepository.deactivate(agent_id=agent_id)

    @staticmethod
    async def unstake_agent(
        *,
        owner_address: str,
        agent_id: str,
        amount: int,
        tx_hash: str,
    ):
        """
        Unstake capital from an owned agent.

        Invariants:
        - amount > 0
        - agent exists
        - caller is owner
        - stake >= amount
        """
        if amount <= 0:
            raise InvariantViolation("INVALID_UNSTAKE_AMOUNT")

        agent = await AgentRepository.get_by_agent_id(agent_id)
        if not agent:
            raise InvariantViolation("AGENT_NOT_FOUND")

        if agent.owner != owner_address:
            raise InvariantViolation("NOT_AGENT_OWNER")

        if int(agent.stake or 0) < amount:
            raise InvariantViolation("INSUFFICIENT_STAKE")

        if not tx_hash:
            raise InvariantViolation("AGENT_UNSTAKE_TX_HASH_REQUIRED")

        await ChainReader.verify_agent_unstake_tx(
            tx_hash=tx_hash,
            owner=owner_address,
            amount=amount,
        )

        return await AgentRepository.unstake(agent_id=agent_id, amount=amount)

    # ------------------------------------------------------------------
    # READ OPERATIONS
    # ------------------------------------------------------------------

    @staticmethod
    async def get_agent(agent_id: str):
        """
        Fetch a single agent by agent_id.
        """
        return await AgentRepository.get_by_agent_id(agent_id)

    @staticmethod
    async def list_agents(limit: int, offset: int):
        """
        Paginated list of agents.
        """
        return await AgentRepository.list(
            limit=limit,
            offset=offset,
        )

    # ------------------------------------------------------------------
    # SCORING (INDEXER / CRON ONLY)
    # ------------------------------------------------------------------

    @staticmethod
    async def recompute_score(agent_id: str):
        """
        Recompute agent score based on historical performance.

        NOTE:
        -----
        Called by indexer / cron, not by API.
        """

        agent = await AgentRepository.get_by_agent_id(agent_id)
        if not agent:
            raise InvariantViolation("AGENT_NOT_FOUND")

        # External scoring engine (Rust via HTTP)
        score = await score_agent(agent_id)

        await AgentRepository.update_score(
            agent_id=agent_id,
            score=score,
        )

        return score
