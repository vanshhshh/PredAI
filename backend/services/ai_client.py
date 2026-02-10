"""
PURPOSE
-------
Client adapter for AI inference service.

This module:
- isolates HTTP transport
- exposes deterministic inference calls
- shields business logic from AI failures
"""

import os
import httpx
from backend.security.invariants import InvariantViolation

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://ai:9000")


class AIClient:
    @staticmethod
    async def recommend_allocation(*, positions, target_risk_score: int):
        payload = {
            "positions": [
                {
                    "vault_id": p.vault_id,
                    "amount": p.amount,
                    "apy_bps": p.apy_bps,
                    "risk_score": p.risk_score,
                }
                for p in positions
            ],
            "target_risk_score": target_risk_score,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    f"{AI_SERVICE_URL}/recommend",
                    json=payload,
                )
                resp.raise_for_status()
                return resp.json()

        except Exception as exc:
            raise InvariantViolation("AI_UNAVAILABLE") from exc
