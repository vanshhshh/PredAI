# File: ai/agents/base_agent.py
"""
PURPOSE
-------
Base class for all AI agents in the platform.

This module:
- defines the canonical agent interface
- enforces lifecycle hooks (init, predict, learn)
- provides common utilities (state, config, logging)
- is intentionally abstract and framework-agnostic

DESIGN RULES (from docs)
------------------------
- No network or blockchain calls here
- Deterministic predictions given same inputs + state
- No hidden global state
- Explicit configuration only
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import time
import uuid


class BaseAgent(ABC):
    """
    Abstract base class for all AI agents.
    """

    def __init__(
        self,
        *,
        agent_id: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
    ):
        self.agent_id = agent_id or str(uuid.uuid4())
        self.config = config or {}
        self.created_at = int(time.time())

        # Internal, mutable state (must be serializable)
        self.state: Dict[str, Any] = {}

    # ------------------------------------------------------------------
    # LIFECYCLE HOOKS
    # ------------------------------------------------------------------

    @abstractmethod
    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Produce a prediction.

        Args:
            input_data: normalized market / signal data

        Returns:
            dict containing at minimum:
                - "outcome": predicted outcome
                - "confidence": confidence score (0.0–1.0)
        """
        raise NotImplementedError

    @abstractmethod
    def learn(self, feedback: Dict[str, Any]) -> None:
        """
        Update internal state based on feedback.

        Args:
            feedback: realized outcomes, rewards, penalties
        """
        raise NotImplementedError

    # ------------------------------------------------------------------
    # STATE MANAGEMENT
    # ------------------------------------------------------------------

    def get_state(self) -> Dict[str, Any]:
        """
        Return a serializable snapshot of agent state.
        """
        return {
            "agent_id": self.agent_id,
            "created_at": self.created_at,
            "config": self.config,
            "state": self.state,
        }

    def load_state(self, snapshot: Dict[str, Any]) -> None:
        """
        Restore agent state from snapshot.
        """
        if snapshot.get("agent_id") != self.agent_id:
            raise ValueError("AGENT_ID_MISMATCH")

        self.state = snapshot.get("state", {})
