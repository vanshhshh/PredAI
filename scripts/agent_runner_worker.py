from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.persistence.db import close_db, init_db  # noqa: E402
from backend.persistence.repositories.agent_repo import AgentRepository  # noqa: E402
from backend.services.autonomous_agent_service import AutonomousAgentService  # noqa: E402


logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("agent-runner")


async def run_once(*, execute_live: bool, market_limit: int) -> None:
    agents = await AgentRepository.list(limit=500, offset=0)
    active = [agent for agent in agents if agent.active]
    logger.info("running autonomous cycle for %d active agents", len(active))
    for agent in active:
        try:
            result = await AutonomousAgentService.run_agent_cycle(
                agent_id=agent.agent_id,
                execute_live=execute_live,
                market_limit=market_limit,
            )
            logger.info(
                "agent %s completed %d decisions",
                agent.agent_id,
                len(result.get("decisions", [])),
            )
        except Exception as exc:
            logger.warning("agent %s cycle failed: %s", agent.agent_id, exc)


async def main() -> None:
    await init_db()
    try:
        interval = max(10, int(os.getenv("AGENT_RUNNER_INTERVAL_SECONDS", "60")))
        market_limit = max(1, min(100, int(os.getenv("AGENT_RUNNER_MARKET_LIMIT", "25"))))
        execute_live = os.getenv("AUTONOMOUS_AGENT_LIVE_TRADING", "false").lower() == "true"
        run_forever = os.getenv("AGENT_RUNNER_ONCE", "false").lower() != "true"

        while True:
            await run_once(execute_live=execute_live, market_limit=market_limit)
            if not run_forever:
                return
            await asyncio.sleep(interval)
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
