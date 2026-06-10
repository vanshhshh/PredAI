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
from backend.services.paper_trading_service import DEFAULT_AGENT_ID, PaperTradingService  # noqa: E402


logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("polymarket-paper-worker")


async def run_once() -> None:
    agent_id = os.getenv("PAPER_AGENT_ID", DEFAULT_AGENT_ID)
    market_limit = max(1, min(10_000, int(os.getenv("PAPER_MARKET_LIMIT", "500"))))
    ingest = await PaperTradingService.ingest_polymarket_markets(limit=market_limit)
    cycle = await PaperTradingService.run_polymarket_paper_cycle(
        agent_id=agent_id,
        market_limit=market_limit,
        ingest_first=False,
    )
    settled = await PaperTradingService.settle_from_polymarket(
        agent_id=agent_id,
        market_limit=market_limit,
    )
    perf = await PaperTradingService.performance(agent_id=agent_id)
    logger.info("ingest=%s cycle=%s settled=%s perf=%s", ingest, cycle, settled, perf)


async def main() -> None:
    await init_db()
    try:
        interval = max(60, int(os.getenv("PAPER_WORKER_INTERVAL_SECONDS", "900")))
        once = os.getenv("PAPER_WORKER_ONCE", "false").lower() == "true"
        while True:
            await run_once()
            if once:
                return
            await asyncio.sleep(interval)
    finally:
        await close_db()


if __name__ == "__main__":
    asyncio.run(main())
