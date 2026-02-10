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

from backend.persistence.repositories.agent_repo import AgentRepository
from backend.persistence.repositories.user_repo import UserRepository
from backend.security.invariants import InvariantViolation
from backend.indexing.block_listener import ChainReader
from backend.indexing.event_handlers.agent_events import AgentEventParser
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

        # Persist initial off-chain state
        agent = await AgentRepository.create(
            agent_id=agent_id,
            owner=owner_address,
            metadata_uri=metadata_uri,
            active=False,
            stake=0,
            score=0,
        )

        # On-chain identity registration
        tx_hash = await ChainReader.register_agent_on_chain(
            owner=owner_address,
            agent_id=agent_id,
            metadata_uri=metadata_uri,
        )
        receipt = await ChainReader.wait_for_tx(tx_hash)

        if not AgentEventParser.verify_registration(receipt, agent_id):
            raise InvariantViolation("AGENT_ONCHAIN_REGISTRATION_FAILED")

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

        tx_hash = await ChainReader.stake_agent_on_chain(
            owner=owner_address,
            agent_id=agent_id,
            amount=amount,
        )
        receipt = await ChainReader.wait_for_tx(tx_hash)

        parsed = AgentEventParser.parse_stake_and_activate(receipt)
        if not parsed:
            raise InvariantViolation("AGENT_STAKE_FAILED")

        updated = await AgentRepository.activate(
            agent_id=agent_id,
            stake=parsed.stake,
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

        tx_hash = await ChainReader.deactivate_agent_on_chain(
            owner=owner_address,
            agent_id=agent_id,
        )
        receipt = await ChainReader.wait_for_tx(tx_hash)

        if not AgentEventParser.verify_deactivation(receipt):
            raise InvariantViolation("AGENT_DEACTIVATION_FAILED")

        return await AgentRepository.deactivate(agent_id=agent_id)

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
