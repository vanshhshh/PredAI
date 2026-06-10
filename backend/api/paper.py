from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.security.auth import get_current_user
from backend.services.paper_trading_service import DEFAULT_AGENT_ID, PaperTradingService


router = APIRouter()


class PaperIngestRequest(BaseModel):
    limit: int = Field(500, ge=1, le=10_000)
    page_size: int = Field(100, ge=1, le=500)


class PaperCycleRequest(BaseModel):
    agent_id: str = Field(DEFAULT_AGENT_ID)
    market_limit: int = Field(500, ge=1, le=10_000)
    ingest_first: bool = True


@router.post("/polymarket/ingest")
async def ingest_polymarket(req: PaperIngestRequest):
    return await PaperTradingService.ingest_polymarket_markets(
        limit=req.limit,
        page_size=req.page_size,
    )


@router.post("/polymarket/run")
async def run_polymarket_paper_cycle(req: PaperCycleRequest, _user=Depends(get_current_user)):
    return await PaperTradingService.run_polymarket_paper_cycle(
        agent_id=req.agent_id,
        market_limit=req.market_limit,
        ingest_first=req.ingest_first,
    )


@router.post("/polymarket/settle")
async def settle_polymarket_paper(req: PaperCycleRequest, _user=Depends(get_current_user)):
    return await PaperTradingService.settle_from_polymarket(
        agent_id=req.agent_id,
        market_limit=req.market_limit,
    )


@router.post("/polymarket/calibrate")
async def calibrate_polymarket_paper(req: PaperCycleRequest, _user=Depends(get_current_user)):
    return await PaperTradingService.recompute_calibration(agent_id=req.agent_id)


@router.get("/polymarket/markets")
async def list_paper_markets(limit: int = 200, offset: int = 0):
    return await PaperTradingService.markets(limit=limit, offset=offset)


@router.get("/polymarket/predictions")
async def list_paper_predictions(
    agent_id: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
):
    return await PaperTradingService.predictions(
        agent_id=agent_id,
        limit=limit,
        offset=offset,
    )


@router.get("/polymarket/performance")
async def get_paper_performance(agent_id: Optional[str] = None):
    return await PaperTradingService.performance(agent_id=agent_id)
