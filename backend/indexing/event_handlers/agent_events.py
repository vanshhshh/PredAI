# File: backend/indexing/event_handlers/agent_events.py
"""
PURPOSE
-------
Event handler for AI agent–related blockchain events.

This module:
- processes agent lifecycle events (register, stake, activate, deactivate)
- updates off-chain agent state deterministically
- is used by ReplayEngine and live indexers
- NEVER performs chain calls
- NEVER contains business logic

DESIGN RULES (from docs)
------------------------
- Idempotent processing
- Deterministic state transitions
- No cross-entity side effects
- Fail closed on malformed events
"""

from typing import Dict, Any

from backend.persistence.repositories.agent_repo import AgentRepository
from backend.security.invariants import InvariantViolation


class AgentEventParser:
    """
    Lightweight helpers for parsing receipts in services.
    """

    @staticmethod
    def verify_registration(receipt: Dict[str, Any], agent_id: str) -> bool:
        for log in receipt.get("logs", []):
            logged_id = log.get("agent_id") or log.get("agentId")
            if (
                log.get("event") == "AgentRegistered"
                and logged_id is not None
                and str(logged_id).lower() == str(agent_id).lower()
            ):
                return True
        return False

    @staticmethod
    def parse_stake_and_activate(receipt: Dict[str, Any]) -> Dict[str, Any] | None:
        for log in receipt.get("logs", []):
            if log.get("event") == "AgentActivated":
                return {"stake": log.get("stake")}
        return None

    @staticmethod
    def verify_deactivation(receipt: Dict[str, Any]) -> bool:
        for log in receipt.get("logs", []):
            if log.get("event") == "AgentDeactivated":
                return True
        return False


class AgentEventHandler:
    """
    Deterministic handler for agent events.
    """

    @staticmethod
    async def handle(event: Dict[str, Any]):
        event_type = event.get("type")

        if event_type == "agent.registered":
            await AgentEventHandler._handle_registered(event)
        elif event_type == "agent.staked":
            await AgentEventHandler._handle_staked(event)
        elif event_type == "agent.activated":
            await AgentEventHandler._handle_activated(event)
        elif event_type == "agent.deactivated":
            await AgentEventHandler._handle_deactivated(event)
        else:
            return

    # --------------------------------------------------------------
    # HANDLERS
    # --------------------------------------------------------------

    @staticmethod
    async def _handle_registered(event: Dict[str, Any]):
        agent_id = event.get("agent_id")
        owner = event.get("owner")
        metadata_uri = event.get("metadata_uri")

        if not agent_id or not owner:
            raise InvariantViolation("MALFORMED_AGENT_REGISTERED_EVENT")

        exists = await AgentRepository.get_by_agent_id(agent_id)
        if exists:
            return  # idempotent

        await AgentRepository.create_from_event(
            agent_id=agent_id,
            owner=owner,
            metadata_uri=metadata_uri,
        )

    @staticmethod
    async def _handle_staked(event: Dict[str, Any]):
        agent_id = event.get("agent_id")
        stake = event.get("stake")

        if not agent_id or stake is None:
            raise InvariantViolation("MALFORMED_AGENT_STAKED_EVENT")

        agent = await AgentRepository.get_by_agent_id(agent_id)
        if not agent:
            raise InvariantViolation("AGENT_NOT_FOUND")

        await AgentRepository.update_stake(
            agent_id=agent_id,
            stake=stake,
        )

    @staticmethod
    async def _handle_activated(event: Dict[str, Any]):
        agent_id = event.get("agent_id")

        if not agent_id:
            raise InvariantViolation("MALFORMED_AGENT_ACTIVATED_EVENT")

        agent = await AgentRepository.get_by_agent_id(agent_id)
        if not agent:
            raise InvariantViolation("AGENT_NOT_FOUND")

        if agent.active:
            return  # idempotent

        await AgentRepository.activate(agent_id=agent_id)

    @staticmethod
    async def _handle_deactivated(event: Dict[str, Any]):
        agent_id = event.get("agent_id")

        if not agent_id:
            raise InvariantViolation("MALFORMED_AGENT_DEACTIVATED_EVENT")

        agent = await AgentRepository.get_by_agent_id(agent_id)
        if not agent:
            raise InvariantViolation("AGENT_NOT_FOUND")

        if not agent.active:
            return  # idempotent

        await AgentRepository.deactivate(agent_id=agent_id)
