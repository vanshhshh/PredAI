from __future__ import annotations

from datetime import datetime, timedelta
from math import log
from typing import Any, Optional

from sqlalchemy import func, select, update

from backend.persistence.db import AsyncSessionLocal
from backend.persistence.repositories.models import AgentPrediction


def _clamp_probability(value_bps: int) -> float:
    return max(1, min(9_999, int(value_bps))) / 10_000


def _settlement_metrics(row: AgentPrediction, final_outcome: bool) -> dict[str, Any]:
    label = 1 if final_outcome else 0
    probability = _clamp_probability(int(row.model_probability_bps or 0))
    correct = (row.side == "YES" and final_outcome) or (row.side == "NO" and not final_outcome)
    brier = (probability - label) ** 2
    log_loss = -log(probability if label == 1 else 1 - probability)

    snapshot = row.source_snapshot or {}
    stake = int(row.stake_amount or 0)
    yes_pool = int(snapshot.get("yes_pool") or 0) + (stake if row.side == "YES" else 0)
    no_pool = int(snapshot.get("no_pool") or 0) + (stake if row.side == "NO" else 0)
    winning_pool = yes_pool if final_outcome else no_pool
    total_pool = yes_pool + no_pool
    estimated_pnl = -stake

    if correct and winning_pool > 0 and stake > 0:
        estimated_payout = (stake * max(total_pool, 1)) // max(winning_pool, 1)
        estimated_pnl = int(estimated_payout) - stake
    elif correct and winning_pool == 0:
        estimated_pnl = 0

    return {
        "correct": correct,
        "brier_score": brier,
        "log_loss": log_loss,
        "estimated_pnl_wei": estimated_pnl,
    }


class AgentPredictionRepository:
    @staticmethod
    async def create_prediction(
        *,
        agent_id: str,
        market_id: str,
        owner: str,
        side: str,
        model_probability_bps: int,
        market_probability_bps: int,
        confidence_bps: int,
        edge_bps: int,
        stake_amount: int,
        status: str,
        reason: str,
        source_snapshot: dict[str, Any],
        tx_hash: Optional[str] = None,
    ) -> AgentPrediction:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                row = AgentPrediction(
                    agent_id=agent_id,
                    market_id=market_id,
                    owner=owner.strip().lower(),
                    side=side,
                    model_probability_bps=int(model_probability_bps),
                    market_probability_bps=int(market_probability_bps),
                    confidence_bps=int(confidence_bps),
                    edge_bps=int(edge_bps),
                    stake_amount=int(stake_amount),
                    status=status,
                    reason=reason,
                    source_snapshot=source_snapshot or {},
                    tx_hash=tx_hash,
                )
                session.add(row)
                await session.flush()
                return row

    @staticmethod
    async def update_execution(
        *,
        prediction_id: str,
        status: str,
        tx_hash: Optional[str],
        reason: str = "",
    ) -> None:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                await session.execute(
                    update(AgentPrediction)
                    .where(AgentPrediction.prediction_id == prediction_id)
                    .values(
                        status=status,
                        tx_hash=tx_hash,
                        reason=reason,
                        updated_at=datetime.utcnow(),
                    )
                )

    @staticmethod
    async def list_by_agent(agent_id: str, limit: int = 100, offset: int = 0) -> list[AgentPrediction]:
        async with AsyncSessionLocal() as session:
            rows = await session.scalars(
                select(AgentPrediction)
                .where(AgentPrediction.agent_id == agent_id)
                .order_by(AgentPrediction.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
            return list(rows)

    @staticmethod
    async def exposure_for_agent_market(*, agent_id: str, market_id: str) -> int:
        async with AsyncSessionLocal() as session:
            total = await session.scalar(
                select(func.coalesce(func.sum(AgentPrediction.stake_amount), 0)).where(
                    AgentPrediction.agent_id == agent_id,
                    AgentPrediction.market_id == market_id,
                    AgentPrediction.status.in_(["PAPER", "SUBMITTED", "EXECUTED"]),
                )
            )
            return int(total or 0)

    @staticmethod
    async def daily_exposure(*, agent_id: str, since_hours: int = 24) -> int:
        since = datetime.utcnow() - timedelta(hours=max(1, int(since_hours)))
        async with AsyncSessionLocal() as session:
            total = await session.scalar(
                select(func.coalesce(func.sum(AgentPrediction.stake_amount), 0)).where(
                    AgentPrediction.agent_id == agent_id,
                    AgentPrediction.created_at >= since,
                    AgentPrediction.status.in_(["PAPER", "SUBMITTED", "EXECUTED"]),
                )
            )
            return int(total or 0)

    @staticmethod
    async def mark_market_settled(*, market_id: str, final_outcome: bool) -> int:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                rows = await session.scalars(
                    select(AgentPrediction).where(
                        AgentPrediction.market_id == market_id,
                        AgentPrediction.settled_outcome.is_(None),
                    )
                )
                count = 0
                for row in rows:
                    row.settled_outcome = bool(final_outcome)
                    row.metrics_json = _settlement_metrics(row, bool(final_outcome))
                    row.updated_at = datetime.utcnow()
                    count += 1
                return count

    @staticmethod
    async def performance(agent_id: str) -> dict[str, Any]:
        rows = await AgentPredictionRepository.list_by_agent(agent_id, limit=1000)
        scored = [row for row in rows if row.settled_outcome is not None and row.metrics_json]
        total = len(scored)
        correct = sum(1 for row in scored if bool((row.metrics_json or {}).get("correct")))
        brier_values = [float((row.metrics_json or {}).get("brier_score", 0)) for row in scored]
        log_loss_values = [float((row.metrics_json or {}).get("log_loss", 0)) for row in scored]
        pnl_values = [int((row.metrics_json or {}).get("estimated_pnl_wei", 0)) for row in scored]

        cumulative = 0
        peak = 0
        max_drawdown = 0
        for pnl in reversed(pnl_values):
            cumulative += pnl
            peak = max(peak, cumulative)
            max_drawdown = min(max_drawdown, cumulative - peak)

        return {
            "total_predictions": len(rows),
            "scored_predictions": total,
            "executed_predictions": sum(1 for row in rows if row.status == "EXECUTED"),
            "paper_predictions": sum(1 for row in rows if row.status == "PAPER"),
            "hit_rate": (correct / total) if total else 0.0,
            "brier_score": (sum(brier_values) / total) if total else 0.0,
            "log_loss": (sum(log_loss_values) / total) if total else 0.0,
            "estimated_pnl_wei": sum(pnl_values),
            "max_drawdown_wei": max_drawdown,
        }
