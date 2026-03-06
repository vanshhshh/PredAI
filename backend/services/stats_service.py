"""
Service layer for platform aggregate stats.
"""

from __future__ import annotations

from backend.persistence.repositories.stats_repo import StatsRepository


class StatsService:
    @staticmethod
    async def get_platform_stats() -> dict[str, int]:
        return await StatsRepository.get_platform_counts()

