import httpx

RUST_CORE_URL = "http://localhost:9000"

async def score_agent(agent_id: str) -> float:
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{RUST_CORE_URL}/score/{agent_id}",
            timeout=2.0
        )
        res.raise_for_status()
        return res.json()["score"]
