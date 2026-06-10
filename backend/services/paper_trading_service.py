from __future__ import annotations

import json
import math
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

import httpx

from backend.persistence.repositories.paper_trading_repo import PaperTradingRepository
from backend.realtime.publisher import publish_protocol_event


POLYMARKET_GAMMA_URL = "https://gamma-api.polymarket.com"
SOURCE_POLYMARKET = "polymarket"
DEFAULT_AGENT_ID = "moltmarket-paper-ai-v1"


KEYWORD_CATEGORIES = {
    "crypto": {"bitcoin", "btc", "ethereum", "eth", "solana", "sol", "xrp", "crypto", "token"},
    "sports": {"nba", "nfl", "mlb", "nhl", "ufc", "soccer", "football", "tennis", "championship"},
    "politics": {"election", "trump", "biden", "congress", "senate", "president", "minister", "poll"},
    "macro": {"fed", "inflation", "recession", "rates", "cpi", "gdp", "tariff", "unemployment"},
    "tech": {"openai", "ai", "gpt", "apple", "google", "microsoft", "tesla", "nvidia"},
    "culture": {"album", "movie", "oscars", "grammy", "song", "celebrity", "tiktok", "youtube"},
}


@dataclass(frozen=True)
class PaperDecision:
    side: str
    model_probability_bps: int
    calibrated_probability_bps: int
    market_probability_bps: int
    confidence_bps: int
    edge_bps: int
    stake_cents: int
    entry_price_bps: int
    current_price_bps: int
    reason: str
    features: dict[str, Any]


def _parse_jsonish(value: Any, default: Any) -> Any:
    if isinstance(value, (list, dict)):
        return value
    if value is None:
        return default
    try:
        return json.loads(str(value))
    except Exception:
        return default


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        parsed = float(value)
        return parsed if math.isfinite(parsed) else default
    except Exception:
        return default


def _as_bps(value: Any, default: int = 5_000) -> int:
    return max(0, min(10_000, int(round(_as_float(value, default / 10_000) * 10_000))))


def _parse_dt(value: Any) -> Optional[datetime]:
    if not value:
        return None
    raw = str(value).replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError:
        return None
    if parsed.tzinfo:
        return parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _category(question: str, description: str, payload: dict[str, Any]) -> str:
    words_in_text = set(re.findall(r"[a-z0-9]+", f"{question} {description}".lower()))
    for name, words in KEYWORD_CATEGORIES.items():
        if words_in_text.intersection(words):
            return name
    events = payload.get("events") if isinstance(payload.get("events"), list) else []
    for event in events:
        event_words = set(re.findall(r"[a-z0-9]+", str(event.get("title") or "").lower()))
        for name, words in KEYWORD_CATEGORIES.items():
            if event_words.intersection(words):
                return name
    return "general"


def _word_score(text: str) -> int:
    positive = {
        "win",
        "wins",
        "approve",
        "approved",
        "pass",
        "passes",
        "launch",
        "release",
        "above",
        "over",
        "record",
        "increase",
    }
    negative = {
        "lose",
        "loses",
        "reject",
        "fails",
        "fail",
        "delay",
        "cancel",
        "below",
        "under",
        "drop",
        "decrease",
    }
    words = set(re.findall(r"[a-z0-9]+", text.lower()))
    return len(words.intersection(positive)) - len(words.intersection(negative))


def _clamp_bps(value: int | float) -> int:
    return max(0, min(10_000, int(round(float(value)))))


def _safe_probability(value_bps: int) -> float:
    return max(1, min(9_999, int(value_bps))) / 10_000


class PaperTradingService:
    @staticmethod
    async def ingest_polymarket_markets(
        *,
        limit: int = 500,
        page_size: int = 100,
        include_closed: bool = False,
    ) -> dict[str, int]:
        total = max(1, min(10_000, int(limit)))
        page_size = max(1, min(500, int(page_size)))
        imported = 0
        updated = 0
        async with httpx.AsyncClient(timeout=30) as client:
            for offset in range(0, total, page_size):
                params = {
                    "active": "true" if not include_closed else "false",
                    "closed": "false" if not include_closed else "true",
                    "limit": min(page_size, total - offset),
                    "offset": offset,
                }
                response = await client.get(f"{POLYMARKET_GAMMA_URL}/markets", params=params)
                response.raise_for_status()
                payload = response.json()
                if not isinstance(payload, list) or not payload:
                    break
                for item in payload:
                    row = await PaperTradingService._upsert_polymarket_item(item)
                    imported += 1
                    if row.updated_at and row.created_at and row.updated_at > row.created_at:
                        updated += 1
        await publish_protocol_event(
            topic="paper",
            event_type="paper.markets.ingested",
            event_key=SOURCE_POLYMARKET,
            payload={"source": SOURCE_POLYMARKET, "imported": imported, "updated": updated},
        )
        return {"imported": imported, "updated": updated}

    @staticmethod
    async def _upsert_polymarket_item(item: dict[str, Any]):
        outcomes = _parse_jsonish(item.get("outcomes"), [])
        prices = _parse_jsonish(item.get("outcomePrices"), [])
        clob_token_ids = _parse_jsonish(item.get("clobTokenIds"), [])
        yes_index = 0
        no_index = 1
        for idx, outcome in enumerate(outcomes):
            normalized = str(outcome).strip().lower()
            if normalized == "yes":
                yes_index = idx
            elif normalized == "no":
                no_index = idx

        yes_price_bps = _as_bps(prices[yes_index] if len(prices) > yes_index else None)
        no_price_bps = _as_bps(prices[no_index] if len(prices) > no_index else None, 10_000 - yes_price_bps)
        closed = bool(item.get("closed"))
        active = bool(item.get("active")) and not closed
        resolved = closed and (yes_price_bps >= 9_900 or no_price_bps >= 9_900)
        final_outcome = None
        if resolved:
            final_outcome = yes_price_bps >= no_price_bps

        question = str(item.get("question") or item.get("title") or "").strip()
        description = str(item.get("description") or "").strip()
        return await PaperTradingRepository.upsert_market(
            source=SOURCE_POLYMARKET,
            external_id=str(item.get("id") or item.get("conditionId") or item.get("slug")),
            slug=str(item.get("slug") or item.get("id") or ""),
            question=question,
            description=description,
            category=_category(question, description, item),
            image_url=item.get("image") or item.get("icon"),
            end_time=_parse_dt(item.get("endDate") or item.get("endDateIso")),
            active=active,
            closed=closed,
            resolved=resolved,
            final_outcome=final_outcome,
            yes_price_bps=yes_price_bps,
            no_price_bps=no_price_bps,
            liquidity=int(round(_as_float(item.get("liquidityNum") or item.get("liquidity")) * 100)),
            volume_24h=int(round(_as_float(item.get("volume24hr") or item.get("volume24hrClob")) * 100)),
            volume_total=int(round(_as_float(item.get("volumeNum") or item.get("volume")) * 100)),
            clob_token_ids=[str(token) for token in clob_token_ids] if isinstance(clob_token_ids, list) else [],
            raw_payload=item,
        )

    @staticmethod
    async def run_polymarket_paper_cycle(
        *,
        agent_id: str = DEFAULT_AGENT_ID,
        market_limit: int = 500,
        ingest_first: bool = True,
    ) -> dict[str, Any]:
        if ingest_first:
            await PaperTradingService.ingest_polymarket_markets(limit=market_limit)

        run_id = str(uuid4())
        markets = await PaperTradingRepository.list_markets(
            source=SOURCE_POLYMARKET,
            active=True,
            limit=max(1, min(10_000, market_limit)),
        )
        created = 0
        updated = 0
        skipped = 0
        for market in markets:
            existing = await PaperTradingRepository.get_prediction(
                agent_id=agent_id,
                source=SOURCE_POLYMARKET,
                external_market_id=market.external_id,
            )
            if existing and existing.status == "OPEN":
                pnl = PaperTradingService._mark_to_market_pnl(existing, market)
                current_price = market.yes_price_bps if existing.side == "YES" else market.no_price_bps
                await PaperTradingRepository.update_mark_to_market(
                    prediction_id=existing.prediction_id,
                    current_price_bps=current_price,
                    pnl_cents=pnl,
                )
                updated += 1
                continue
            if existing:
                skipped += 1
                continue

            decision = await PaperTradingService._decide(agent_id=agent_id, market=market)
            await PaperTradingRepository.create_prediction(
                run_id=run_id,
                agent_id=agent_id,
                source=SOURCE_POLYMARKET,
                external_market_id=market.external_id,
                question=market.question,
                category=market.category,
                side=decision.side,
                model_probability_bps=decision.model_probability_bps,
                calibrated_probability_bps=decision.calibrated_probability_bps,
                market_probability_bps=decision.market_probability_bps,
                confidence_bps=decision.confidence_bps,
                edge_bps=decision.edge_bps,
                stake_cents=decision.stake_cents,
                entry_price_bps=decision.entry_price_bps,
                current_price_bps=decision.current_price_bps,
                status="OPEN",
                reason=decision.reason,
                features=decision.features,
            )
            created += 1

        await publish_protocol_event(
            topic="paper",
            event_type="paper.cycle.completed",
            event_key=agent_id,
            payload={
                "agent_id": agent_id,
                "run_id": run_id,
                "created": created,
                "updated": updated,
                "skipped": skipped,
                "markets_seen": len(markets),
            },
        )
        return {
            "agent_id": agent_id,
            "run_id": run_id,
            "markets_seen": len(markets),
            "created": created,
            "updated": updated,
            "skipped": skipped,
        }

    @staticmethod
    async def _decide(*, agent_id: str, market) -> PaperDecision:
        market_probability_bps = int(market.yes_price_bps)
        raw_probability_bps, confidence_bps, features = PaperTradingService._raw_model(market)
        external_signals = await PaperTradingService._external_signals(market)
        if external_signals:
            raw_probability_bps, confidence_bps = PaperTradingService._blend_external_signals(
                base_probability_bps=raw_probability_bps,
                base_confidence_bps=confidence_bps,
                external_signals=external_signals,
            )
        features["external_signals"] = external_signals
        calibration = await PaperTradingRepository.get_calibration(
            agent_id=agent_id,
            source=SOURCE_POLYMARKET,
            category=market.category,
        )
        bias_bps = int(calibration.bias_bps) if calibration else 0
        calibrated = _clamp_bps(raw_probability_bps + bias_bps)
        yes_edge = calibrated - market_probability_bps
        no_edge = market_probability_bps - calibrated
        side = "YES" if yes_edge >= no_edge else "NO"
        edge_bps = max(yes_edge, no_edge)
        entry_price_bps = int(market.yes_price_bps if side == "YES" else market.no_price_bps)
        entry_price_bps = max(1, min(9_999, entry_price_bps))
        stake_cents = PaperTradingService._stake_size(edge_bps=max(0, edge_bps), confidence_bps=confidence_bps)

        features["calibration_bias_bps"] = bias_bps
        features["source_price_bps"] = {
            "YES": int(market.yes_price_bps),
            "NO": int(market.no_price_bps),
        }
        return PaperDecision(
            side=side,
            model_probability_bps=raw_probability_bps,
            calibrated_probability_bps=calibrated,
            market_probability_bps=market_probability_bps,
            confidence_bps=confidence_bps,
            edge_bps=int(edge_bps),
            stake_cents=stake_cents,
            entry_price_bps=entry_price_bps,
            current_price_bps=entry_price_bps,
            reason="FULL_COVERAGE_PAPER_POSITION",
            features=features,
        )

    @staticmethod
    def _raw_model(market) -> tuple[int, int, dict[str, Any]]:
        raw = market.raw_payload or {}
        base = int(market.yes_price_bps)
        momentum = (
            _as_float(raw.get("oneHourPriceChange")) * 1_000
            + _as_float(raw.get("oneDayPriceChange")) * 1_500
            + _as_float(raw.get("oneWeekPriceChange")) * 1_000
            + _as_float(raw.get("oneMonthPriceChange")) * 500
        )
        liquidity_score = min(2_000, math.log10(max(1, int(market.liquidity or 0))) * 350)
        volume_score = min(2_000, math.log10(max(1, int(market.volume_24h or 0))) * 350)
        language_score = _word_score(f"{market.question} {market.description}") * 120
        crowd_anchor = (base - 5_000) * 0.15

        probability = _clamp_bps(base + momentum + language_score + crowd_anchor)
        confidence = _clamp_bps(
            abs(probability - 5_000) * 0.7
            + min(1_800, liquidity_score)
            + min(1_400, volume_score)
        )
        features = {
            "model": "momentum-liquidity-language-v1",
            "base_market_probability_bps": base,
            "momentum_bps": int(momentum),
            "language_bps": int(language_score),
            "crowd_anchor_bps": int(crowd_anchor),
            "liquidity_score_bps": int(liquidity_score),
            "volume_score_bps": int(volume_score),
            "category": market.category,
            "updated_at": datetime.utcnow().isoformat(),
        }
        return probability, confidence, features

    @staticmethod
    async def _external_signals(market) -> list[dict[str, Any]]:
        endpoints = [item.strip() for item in os.getenv("AGENT_SIGNAL_ENDPOINTS", "").split(",") if item.strip()]
        if not endpoints:
            return []

        signals: list[dict[str, Any]] = []
        async with httpx.AsyncClient(timeout=8) as client:
            for endpoint in endpoints:
                try:
                    response = await client.get(
                        endpoint,
                        params={
                            "market_id": market.external_id,
                            "title": market.question,
                            "description": market.description,
                            "category": market.category,
                        },
                    )
                    response.raise_for_status()
                    payload = response.json()
                except Exception:
                    continue

                if not isinstance(payload, dict):
                    continue
                probability = payload.get("probability_bps")
                if probability is None and payload.get("probability") is not None:
                    probability = float(payload["probability"]) * 10_000
                if probability is None:
                    continue
                confidence = payload.get("confidence_bps")
                if confidence is None and payload.get("confidence") is not None:
                    confidence = float(payload["confidence"]) * 10_000
                signals.append(
                    {
                        "source": str(payload.get("source") or endpoint),
                        "probability_bps": _clamp_bps(probability),
                        "confidence_bps": _clamp_bps(confidence or 1_000),
                    }
                )
        return signals

    @staticmethod
    def _blend_external_signals(
        *,
        base_probability_bps: int,
        base_confidence_bps: int,
        external_signals: list[dict[str, Any]],
    ) -> tuple[int, int]:
        weighted = [(base_probability_bps, max(1_000, int(base_confidence_bps)))]
        for signal in external_signals:
            confidence_bps = _clamp_bps(signal.get("confidence_bps") or 0)
            if confidence_bps <= 0:
                continue
            weighted.append((_clamp_bps(signal.get("probability_bps") or base_probability_bps), confidence_bps))

        total_weight = sum(weight for _, weight in weighted)
        probability = sum(probability_bps * weight for probability_bps, weight in weighted) / max(1, total_weight)
        confidence = max([base_confidence_bps, *(weight for _, weight in weighted)])
        confidence = max(confidence, abs(probability - 5_000) * 0.8)
        return _clamp_bps(probability), _clamp_bps(confidence)

    @staticmethod
    def _stake_size(*, edge_bps: int, confidence_bps: int) -> int:
        min_cents = max(1, int(os.getenv("PAPER_MIN_STAKE_CENTS", "100")))
        max_cents = max(min_cents, int(os.getenv("PAPER_MAX_STAKE_CENTS", "1000")))
        edge_scale = min(1.0, max(0.0, edge_bps / 2_500))
        confidence_scale = min(1.0, max(0.1, confidence_bps / 6_000))
        return max(min_cents, min(max_cents, int(max_cents * max(0.1, edge_scale) * confidence_scale)))

    @staticmethod
    def _mark_to_market_pnl(prediction, market) -> int:
        current_price_bps = int(market.yes_price_bps if prediction.side == "YES" else market.no_price_bps)
        entry = max(1, int(prediction.entry_price_bps or 1))
        shares = int(prediction.stake_cents or 0) / (entry / 10_000)
        current_value = shares * (current_price_bps / 10_000)
        return int(round(current_value - int(prediction.stake_cents or 0)))

    @staticmethod
    async def settle_from_polymarket(
        *,
        agent_id: str = DEFAULT_AGENT_ID,
        market_limit: int = 500,
    ) -> dict[str, int]:
        await PaperTradingService.ingest_polymarket_markets(
            limit=market_limit,
            include_closed=True,
        )
        open_predictions = await PaperTradingRepository.list_predictions(
            agent_id=agent_id,
            status="OPEN",
            source=SOURCE_POLYMARKET,
            limit=10_000,
        )
        settled = 0
        for prediction in open_predictions:
            market = await PaperTradingRepository.get_market(
                source=SOURCE_POLYMARKET,
                external_id=prediction.external_market_id,
            )
            if not market or not market.resolved or market.final_outcome is None:
                continue
            is_correct = (prediction.side == "YES" and market.final_outcome) or (
                prediction.side == "NO" and not market.final_outcome
            )
            exit_price_bps = 10_000 if is_correct else 0
            pnl_cents = PaperTradingService._settled_pnl(prediction, exit_price_bps)
            label = 1 if market.final_outcome else 0
            probability = _safe_probability(int(prediction.calibrated_probability_bps))
            metrics = {
                "correct": is_correct,
                "brier_score": (probability - label) ** 2,
                "log_loss": -math.log(probability if label == 1 else 1 - probability),
                "entry_price_bps": int(prediction.entry_price_bps),
                "exit_price_bps": exit_price_bps,
            }
            await PaperTradingRepository.settle_prediction(
                prediction_id=prediction.prediction_id,
                final_outcome=bool(market.final_outcome),
                exit_price_bps=exit_price_bps,
                pnl_cents=pnl_cents,
                metrics=metrics,
            )
            settled += 1
        if settled:
            await PaperTradingService.recompute_calibration(agent_id=agent_id)
        return {"settled": settled}

    @staticmethod
    def _settled_pnl(prediction, exit_price_bps: int) -> int:
        entry = max(1, int(prediction.entry_price_bps or 1))
        shares = int(prediction.stake_cents or 0) / (entry / 10_000)
        exit_value = shares * (exit_price_bps / 10_000)
        return int(round(exit_value - int(prediction.stake_cents or 0)))

    @staticmethod
    async def recompute_calibration(*, agent_id: str = DEFAULT_AGENT_ID) -> dict[str, Any]:
        predictions = await PaperTradingRepository.list_predictions(
            agent_id=agent_id,
            status="SETTLED",
            source=SOURCE_POLYMARKET,
            limit=10_000,
        )
        categories = sorted({row.category for row in predictions})
        updated = 0
        for category in categories:
            rows = [row for row in predictions if row.category == category and row.final_outcome is not None]
            if not rows:
                continue
            errors = []
            briers = []
            log_losses = []
            for row in rows:
                label_bps = 10_000 if row.final_outcome else 0
                errors.append(label_bps - int(row.model_probability_bps))
                probability = _safe_probability(int(row.model_probability_bps))
                label = 1 if row.final_outcome else 0
                briers.append((probability - label) ** 2)
                log_losses.append(-math.log(probability if label == 1 else 1 - probability))
            sample_count = len(rows)
            shrink = sample_count / (sample_count + 25)
            bias_bps = int(max(-1_500, min(1_500, (sum(errors) / sample_count) * shrink)))
            await PaperTradingRepository.upsert_calibration(
                agent_id=agent_id,
                source=SOURCE_POLYMARKET,
                category=category,
                sample_count=sample_count,
                bias_bps=bias_bps,
                brier_score=int((sum(briers) / sample_count) * 10_000),
                log_loss_bps=int((sum(log_losses) / sample_count) * 10_000),
            )
            updated += 1
        return {"updated_categories": updated}

    @staticmethod
    async def markets(limit: int = 200, offset: int = 0) -> list[dict[str, Any]]:
        rows = await PaperTradingRepository.list_markets(
            source=SOURCE_POLYMARKET,
            active=None,
            limit=max(1, min(500, limit)),
            offset=max(0, offset),
        )
        return [PaperTradingService._market_payload(row) for row in rows]

    @staticmethod
    async def predictions(agent_id: Optional[str] = None, limit: int = 200, offset: int = 0) -> list[dict[str, Any]]:
        rows = await PaperTradingRepository.list_predictions(
            agent_id=agent_id,
            source=SOURCE_POLYMARKET,
            limit=max(1, min(500, limit)),
            offset=max(0, offset),
        )
        return [PaperTradingService._prediction_payload(row) for row in rows]

    @staticmethod
    async def performance(agent_id: Optional[str] = None) -> dict[str, Any]:
        return await PaperTradingRepository.performance(
            agent_id=agent_id,
            source=SOURCE_POLYMARKET,
        )

    @staticmethod
    def _market_payload(row) -> dict[str, Any]:
        return {
            "paper_market_id": row.paper_market_id,
            "source": row.source,
            "external_id": row.external_id,
            "slug": row.slug,
            "question": row.question,
            "description": row.description,
            "category": row.category,
            "image_url": row.image_url,
            "end_time": row.end_time.isoformat() if row.end_time else None,
            "active": bool(row.active),
            "closed": bool(row.closed),
            "resolved": bool(row.resolved),
            "final_outcome": row.final_outcome,
            "yes_price": int(row.yes_price_bps) / 10_000,
            "no_price": int(row.no_price_bps) / 10_000,
            "liquidity": int(row.liquidity or 0) / 100,
            "volume_24h": int(row.volume_24h or 0) / 100,
            "volume_total": int(row.volume_total or 0) / 100,
            "updated_at": row.updated_at.isoformat(),
        }

    @staticmethod
    def _prediction_payload(row) -> dict[str, Any]:
        return {
            "prediction_id": row.prediction_id,
            "run_id": row.run_id,
            "agent_id": row.agent_id,
            "source": row.source,
            "external_market_id": row.external_market_id,
            "question": row.question,
            "category": row.category,
            "side": row.side,
            "model_probability": int(row.model_probability_bps) / 10_000,
            "calibrated_probability": int(row.calibrated_probability_bps) / 10_000,
            "market_probability": int(row.market_probability_bps) / 10_000,
            "confidence": int(row.confidence_bps) / 10_000,
            "edge": int(row.edge_bps) / 10_000,
            "stake": int(row.stake_cents or 0) / 100,
            "entry_price": int(row.entry_price_bps) / 10_000,
            "current_price": int(row.current_price_bps) / 10_000,
            "status": row.status,
            "reason": row.reason,
            "final_outcome": row.final_outcome,
            "pnl": int(row.pnl_cents or 0) / 100,
            "metrics": row.metrics_json or {},
            "opened_at": row.opened_at.isoformat(),
            "settled_at": row.settled_at.isoformat() if row.settled_at else None,
        }
