import httpx
import os

from backend.security.invariants import InvariantViolation


RUST_CORE_URL = os.getenv("RUST_CORE_URL", "").strip()

async def score_agent(agent_id: str) -> float:
    if not RUST_CORE_URL:
        raise InvariantViolation("RUST_CORE_URL_NOT_CONFIGURED")
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{RUST_CORE_URL}/score/{agent_id}",
            timeout=2.0
        )
        res.raise_for_status()
        return res.json()["score"]
