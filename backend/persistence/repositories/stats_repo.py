"""
Read-only aggregate stats repository.
"""

from __future__ import annotations

from sqlalchemy import func, select

from backend.persistence.db import AsyncSessionLocal
from backend.persistence.repositories.models import Agent, Market, MarketBet, User


class StatsRepository:
    @staticmethod
    async def get_platform_counts() -> dict[str, int]:
        async with AsyncSessionLocal() as session:
            total_markets = await session.scalar(
                select(func.count()).select_from(Market)
            )
            total_wallets = await session.scalar(
                select(func.count()).select_from(User)
            )
            total_bets = await session.scalar(
                select(func.count()).select_from(MarketBet)
            )
            total_agents = await session.scalar(
                select(func.count()).select_from(Agent)
            )

            return {
                "total_markets": int(total_markets or 0),
                "total_wallets": int(total_wallets or 0),
                "total_bets": int(total_bets or 0),
                "total_agents": int(total_agents or 0),
            }

