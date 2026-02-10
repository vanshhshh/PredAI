# File: ai/agents/social_agent.py
"""
PURPOSE
-------
Social-signal–driven AI agent.

This agent:
- consumes normalized social signals (sentiment, volume, velocity)
- translates discourse into probabilistic market signals
- proposes new markets or adjusts beliefs on existing ones
- NEVER directly interacts with social networks or blockchains

DESIGN RULES (from docs)
------------------------
- No network or API calls here
- Deterministic given inputs + internal state
- Conservative confidence calibration
- Explicit signal weighting
"""

from typing import Dict, Any

from ai.agents.base_agent import BaseAgent


class SocialAgent(BaseAgent):
    """
    AI agent that converts social signals into prediction signals.
    """

    def __init__(
        self,
        *,
        agent_id: str | None = None,
        config: Dict[str, Any] | None = None,
    ):
        super().__init__(agent_id=agent_id, config=config)

        # Configurable weights
        self.sentiment_weight = self.config.get("sentiment_weight", 0.4)
        self.volume_weight = self.config.get("volume_weight", 0.3)
        self.velocity_weight = self.config.get("velocity_weight", 0.3)

    # ------------------------------------------------------------------
    # CORE LOGIC
    # ------------------------------------------------------------------

    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert social metrics into a probability signal.

        input_data expected keys:
        - "sentiment": float in [-1.0, 1.0]
        - "volume": normalized [0.0, 1.0]
        - "velocity": normalized [0.0, 1.0]
        """

        sentiment = input_data.get("sentiment", 0.0)
        volume = input_data.get("volume", 0.0)
        velocity = input_data.get("velocity", 0.0)

        # Normalize sentiment to [0,1]
        sentiment_norm = (sentiment + 1.0) / 2.0

        probability = (
            sentiment_norm * self.sentiment_weight
            + volume * self.volume_weight
            + velocity * self.velocity_weight
        )

        probability = max(0.0, min(1.0, probability))

        return {
            "outcome": probability >= 0.5,
            "probability": probability,
            "confidence": abs(probability - 0.5) * 2,
        }

    def learn(self, feedback: Dict[str, Any]) -> None:
        """
        Optional learning hook for recalibrating weights.
        Currently no adaptive learning (explicit by design).
        """
        return
