# File: ai/registry/agent_registry.py
"""
PURPOSE
-------
Canonical registry for AI agents.

This module:
- tracks registered agents and their metadata
- manages lifecycle state (registered, active, retired)
- provides deterministic lookup for backend and AI services
- acts as the single source of truth for agent identity ↔ model mapping

DESIGN RULES (from docs)
------------------------
- No network or blockchain calls
- No training or inference logic
- Deterministic, in-memory–friendly logic
- Registry state must be serializable
"""

from typing import Dict, Optional
from dataclasses import dataclass, field
import time


@dataclass
class AgentRecord:
    """
    Immutable-ish record describing an agent.
    """
    agent_id: str
    model_id: str
    owner: str
    created_at: int
    active: bool = False
    metadata: Dict[str, str] = field(default_factory=dict)


class AgentRegistry:
    """
    In-memory agent registry.

    NOTE:
    -----
    Persistence is handled by backend services.
    This registry is a deterministic coordination layer.
    """

    def __init__(self):
        self._agents: Dict[str, AgentRecord] = {}

    # ------------------------------------------------------------------
    # REGISTRATION
    # ------------------------------------------------------------------

    def register(
        self,
        *,
        agent_id: str,
        model_id: str,
        owner: str,
        metadata: Optional[Dict[str, str]] = None,
    ) -> AgentRecord:
        if agent_id in self._agents:
            raise ValueError("AGENT_ALREADY_REGISTERED")

        record = AgentRecord(
            agent_id=agent_id,
            model_id=model_id,
            owner=owner,
            created_at=int(time.time()),
            active=False,
            metadata=metadata or {},
        )
        self._agents[agent_id] = record
        return record

    # ------------------------------------------------------------------
    # STATE MANAGEMENT
    # ------------------------------------------------------------------

    def activate(self, agent_id: str) -> AgentRecord:
        record = self.get(agent_id)
        if record.active:
            return record

        record.active = True
        return record

    def deactivate(self, agent_id: str) -> AgentRecord:
        record = self.get(agent_id)
        if not record.active:
            return record

        record.active = False
        return record

    # ------------------------------------------------------------------
    # LOOKUPS
    # ------------------------------------------------------------------

    def get(self, agent_id: str) -> AgentRecord:
        if agent_id not in self._agents:
            raise KeyError("AGENT_NOT_FOUND")
        return self._agents[agent_id]

    def is_active(self, agent_id: str) -> bool:
        return self.get(agent_id).active

    def all_agents(self) -> Dict[str, AgentRecord]:
        return dict(self._agents)
