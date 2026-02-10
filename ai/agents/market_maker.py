# File: ai/agents/market_maker.py
"""
PURPOSE
-------
Autonomous market-making AI agent.

This agent:
- provides continuous liquidity to prediction markets
- dynamically adjusts odds based on signals and inventory
- manages exposure using risk constraints
- is designed to run continuously (agent loop handled elsewhere)

DESIGN RULES (from docs)
------------------------
- No direct blockchain calls
- No network calls here
- Deterministic given inputs + internal state
- Conservative risk management by default
"""

from typing import Dict, Any
import math

from ai.agents.base_agent import BaseAgent


class MarketMakerAgent(BaseAgent):
    """
    AI agent that quotes prices and sizes for prediction markets.
    """

    def __init__(
        self,
        *,
        agent_id: str | None = None,
        config: Dict[str, Any] | None = None,
    ):
        super().__init__(agent_id=agent_id, config=config)

        # Config defaults
        self.max_inventory = self.config.get("max_inventory", 1_000_000)
        self.base_spread_bps = self.config.get("base_spread_bps", 200)
        self.risk_aversion = self.config.get("risk_aversion", 1.0)

        # Internal state
        self.state.setdefault("inventory_yes", 0)
        self.state.setdefault("inventory_no", 0)

    # ------------------------------------------------------------------
    # CORE LOGIC
    # ------------------------------------------------------------------

    def predict(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Quote bid/ask odds for a market.

        input_data expected keys:
        - "fair_probability" (0.0–1.0)
        - "liquidity" (optional)
        """

        fair_p = input_data.get("fair_probability")
        if fair_p is None:
            raise ValueError("FAIR_PROBABILITY_REQUIRED")

        # Inventory skew
        inv_yes = self.state["inventory_yes"]
        inv_no = self.state["inventory_no"]
        net_inventory = inv_yes - inv_no

        # Inventory penalty
        inventory_skew = net_inventory / max(self.max_inventory, 1)

        # Spread adjustment
        spread = self.base_spread_bps / 10_000
        adjustment = self.risk_aversion * inventory_skew

        bid_p = max(0.0, fair_p - spread - adjustment)
        ask_p = min(1.0, fair_p + spread - adjustment)

        return {
            "bid_probability": bid_p,
            "ask_probability": ask_p,
            "confidence": 1.0 - abs(inventory_skew),
        }

    def learn(self, feedback: Dict[str, Any]) -> None:
        """
        Update inventory based on executed trades.

        feedback expected keys:
        - "filled_yes"
        - "filled_no"
        """

        filled_yes = feedback.get("filled_yes", 0)
        filled_no = feedback.get("filled_no", 0)

        self.state["inventory_yes"] += filled_yes
        self.state["inventory_no"] += filled_no
