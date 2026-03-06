"""
Aggregate platform stats endpoints.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from backend.services.stats_service import StatsService


router = APIRouter()


class PlatformStatsResponse(BaseModel):
    total_markets: int
    total_wallets: int
    total_bets: int
    total_agents: int


@router.get("/stats", response_model=PlatformStatsResponse)
async def get_platform_stats():
    return await StatsService.get_platform_stats()

