from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from sqlalchemy import func, select, update

from backend.persistence.db import AsyncSessionLocal
from backend.persistence.repositories.models import (
    PaperMarket,
    PaperModelCalibration,
    PaperPrediction,
)


def _clamp_bps(value: int | float) -> int:
    return max(0, min(10_000, int(round(float(value)))))


class PaperTradingRepository:
    @staticmethod
    async def upsert_market(
        *,
        source: str,
        external_id: str,
        slug: str,
        question: str,
        description: str,
        category: str,
        image_url: Optional[str],
        end_time: Optional[datetime],
        active: bool,
        closed: bool,
        resolved: bool,
        final_outcome: Optional[bool],
        yes_price_bps: int,
        no_price_bps: int,
        liquidity: int,
        volume_24h: int,
        volume_total: int,
        clob_token_ids: list[str],
        raw_payload: dict[str, Any],
    ) -> PaperMarket:
        values = {
            "source": source,
            "external_id": external_id,
            "slug": slug,
            "question": question,
            "description": description,
            "category": category or "general",
            "image_url": image_url,
            "end_time": end_time,
            "active": active,
            "closed": closed,
            "resolved": resolved,
            "final_outcome": final_outcome,
            "yes_price_bps": _clamp_bps(yes_price_bps),
            "no_price_bps": _clamp_bps(no_price_bps),
            "liquidity": max(0, int(liquidity)),
            "volume_24h": max(0, int(volume_24h)),
            "volume_total": max(0, int(volume_total)),
            "clob_token_ids": clob_token_ids,
            "raw_payload": raw_payload,
            "updated_at": datetime.utcnow(),
        }
        async with AsyncSessionLocal() as session:
            async with session.begin():
                existing = await session.scalar(
                    select(PaperMarket).where(
                        PaperMarket.source == source,
                        PaperMarket.external_id == external_id,
                    )
                )
                if existing:
                    for key, value in values.items():
                        setattr(existing, key, value)
                    await session.flush()
                    return existing

                row = PaperMarket(**values)
                session.add(row)
                await session.flush()
                return row

    @staticmethod
    async def list_markets(
        *,
        source: str = "polymarket",
        active: Optional[bool] = None,
        limit: int = 200,
        offset: int = 0,
    ) -> list[PaperMarket]:
        async with AsyncSessionLocal() as session:
            stmt = (
                select(PaperMarket)
                .where(PaperMarket.source == source)
                .order_by(PaperMarket.volume_24h.desc(), PaperMarket.updated_at.desc())
                .limit(limit)
                .offset(offset)
            )
            if active is not None:
                stmt = stmt.where(PaperMarket.active.is_(active))
            rows = await session.scalars(stmt)
            return list(rows)

    @staticmethod
    async def get_market(*, source: str, external_id: str) -> Optional[PaperMarket]:
        async with AsyncSessionLocal() as session:
            return await session.scalar(
                select(PaperMarket).where(
                    PaperMarket.source == source,
                    PaperMarket.external_id == external_id,
                )
            )

    @staticmethod
    async def get_prediction(
        *,
        agent_id: str,
        source: str,
        external_market_id: str,
    ) -> Optional[PaperPrediction]:
        async with AsyncSessionLocal() as session:
            return await session.scalar(
                select(PaperPrediction).where(
                    PaperPrediction.agent_id == agent_id,
                    PaperPrediction.source == source,
                    PaperPrediction.external_market_id == external_market_id,
                )
            )

    @staticmethod
    async def create_prediction(
        *,
        run_id: str,
        agent_id: str,
        source: str,
        external_market_id: str,
        question: str,
        category: str,
        side: str,
        model_probability_bps: int,
        calibrated_probability_bps: int,
        market_probability_bps: int,
        confidence_bps: int,
        edge_bps: int,
        stake_cents: int,
        entry_price_bps: int,
        current_price_bps: int,
        status: str,
        reason: str,
        features: dict[str, Any],
    ) -> PaperPrediction:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                row = PaperPrediction(
                    run_id=run_id,
                    agent_id=agent_id,
                    source=source,
                    external_market_id=external_market_id,
                    question=question,
                    category=category or "general",
                    side=side,
                    model_probability_bps=_clamp_bps(model_probability_bps),
                    calibrated_probability_bps=_clamp_bps(calibrated_probability_bps),
                    market_probability_bps=_clamp_bps(market_probability_bps),
                    confidence_bps=_clamp_bps(confidence_bps),
                    edge_bps=int(edge_bps),
                    stake_cents=max(0, int(stake_cents)),
                    entry_price_bps=_clamp_bps(entry_price_bps),
                    current_price_bps=_clamp_bps(current_price_bps),
                    status=status,
                    reason=reason,
                    features_json=features,
                )
                session.add(row)
                await session.flush()
                return row

    @staticmethod
    async def update_mark_to_market(
        *,
        prediction_id: str,
        current_price_bps: int,
        pnl_cents: int,
    ) -> None:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                await session.execute(
                    update(PaperPrediction)
                    .where(PaperPrediction.prediction_id == prediction_id)
                    .values(
                        current_price_bps=_clamp_bps(current_price_bps),
                        pnl_cents=int(pnl_cents),
                        updated_at=datetime.utcnow(),
                    )
                )

    @staticmethod
    async def settle_prediction(
        *,
        prediction_id: str,
        final_outcome: bool,
        exit_price_bps: int,
        pnl_cents: int,
        metrics: dict[str, Any],
    ) -> None:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                await session.execute(
                    update(PaperPrediction)
                    .where(PaperPrediction.prediction_id == prediction_id)
                    .values(
                        status="SETTLED",
                        final_outcome=bool(final_outcome),
                        exit_price_bps=_clamp_bps(exit_price_bps),
                        current_price_bps=_clamp_bps(exit_price_bps),
                        pnl_cents=int(pnl_cents),
                        metrics_json=metrics,
                        settled_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )
                )

    @staticmethod
    async def list_predictions(
        *,
        agent_id: Optional[str] = None,
        status: Optional[str] = None,
        source: str = "polymarket",
        limit: int = 200,
        offset: int = 0,
    ) -> list[PaperPrediction]:
        async with AsyncSessionLocal() as session:
            stmt = (
                select(PaperPrediction)
                .where(PaperPrediction.source == source)
                .order_by(PaperPrediction.opened_at.desc())
                .limit(limit)
                .offset(offset)
            )
            if agent_id:
                stmt = stmt.where(PaperPrediction.agent_id == agent_id)
            if status:
                stmt = stmt.where(PaperPrediction.status == status)
            rows = await session.scalars(stmt)
            return list(rows)

    @staticmethod
    async def get_calibration(
        *,
        agent_id: str,
        source: str,
        category: str,
    ) -> Optional[PaperModelCalibration]:
        async with AsyncSessionLocal() as session:
            return await session.scalar(
                select(PaperModelCalibration).where(
                    PaperModelCalibration.agent_id == agent_id,
                    PaperModelCalibration.source == source,
                    PaperModelCalibration.category == category,
                )
            )

    @staticmethod
    async def upsert_calibration(
        *,
        agent_id: str,
        source: str,
        category: str,
        sample_count: int,
        bias_bps: int,
        brier_score: int,
        log_loss_bps: int,
    ) -> PaperModelCalibration:
        values = {
            "agent_id": agent_id,
            "source": source,
            "category": category or "general",
            "sample_count": max(0, int(sample_count)),
            "bias_bps": int(bias_bps),
            "brier_score": max(0, int(brier_score)),
            "log_loss_bps": max(0, int(log_loss_bps)),
            "updated_at": datetime.utcnow(),
        }
        async with AsyncSessionLocal() as session:
            async with session.begin():
                existing = await session.scalar(
                    select(PaperModelCalibration).where(
                        PaperModelCalibration.agent_id == agent_id,
                        PaperModelCalibration.source == source,
                        PaperModelCalibration.category == values["category"],
                    )
                )
                if existing:
                    for key, value in values.items():
                        setattr(existing, key, value)
                    await session.flush()
                    return existing
                row = PaperModelCalibration(**values)
                session.add(row)
                await session.flush()
                return row

    @staticmethod
    async def performance(*, agent_id: Optional[str] = None, source: str = "polymarket") -> dict[str, Any]:
        predictions = await PaperTradingRepository.list_predictions(
            agent_id=agent_id,
            source=source,
            limit=10_000,
        )
        opened = [row for row in predictions if row.status in {"OPEN", "SETTLED"}]
        settled = [row for row in predictions if row.status == "SETTLED" and row.metrics_json]
        correct = sum(1 for row in settled if bool((row.metrics_json or {}).get("correct")))
        brier_values = [float((row.metrics_json or {}).get("brier_score", 0)) for row in settled]
        log_values = [float((row.metrics_json or {}).get("log_loss", 0)) for row in settled]
        pnl_values = [int(row.pnl_cents or 0) for row in opened]

        cumulative = 0
        peak = 0
        max_drawdown = 0
        for pnl in reversed(pnl_values):
            cumulative += pnl
            peak = max(peak, cumulative)
            max_drawdown = min(max_drawdown, cumulative - peak)

        by_status_rows = {}
        for row in predictions:
            by_status_rows[row.status] = by_status_rows.get(row.status, 0) + 1

        total_staked = sum(int(row.stake_cents or 0) for row in opened)
        return {
            "total_predictions": len(predictions),
            "open_predictions": by_status_rows.get("OPEN", 0),
            "settled_predictions": len(settled),
            "skipped_predictions": by_status_rows.get("SKIPPED", 0),
            "hit_rate": (correct / len(settled)) if settled else 0.0,
            "brier_score": (sum(brier_values) / len(settled)) if settled else 0.0,
            "log_loss": (sum(log_values) / len(settled)) if settled else 0.0,
            "pnl_cents": sum(pnl_values),
            "total_staked_cents": total_staked,
            "roi": (sum(pnl_values) / total_staked) if total_staked else 0.0,
            "max_drawdown_cents": max_drawdown,
        }

    @staticmethod
    async def category_settled_predictions(
        *,
        agent_id: str,
        source: str,
        category: str,
        limit: int = 500,
    ) -> list[PaperPrediction]:
        async with AsyncSessionLocal() as session:
            rows = await session.scalars(
                select(PaperPrediction)
                .where(
                    PaperPrediction.agent_id == agent_id,
                    PaperPrediction.source == source,
                    PaperPrediction.category == category,
                    PaperPrediction.status == "SETTLED",
                    PaperPrediction.final_outcome.is_not(None),
                )
                .order_by(PaperPrediction.settled_at.desc())
                .limit(limit)
            )
            return list(rows)
