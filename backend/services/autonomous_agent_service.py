from __future__ import annotations

import base64
import json
import os
import re
import time
from dataclasses import dataclass
from typing import Any, Optional

import httpx

from backend.indexing.block_listener import ChainReader
from backend.persistence.repositories.agent_prediction_repo import AgentPredictionRepository
from backend.persistence.repositories.agent_repo import AgentRepository
from backend.persistence.repositories.market_repo import MarketRepository
from backend.persistence.repositories.oracle_repo import OracleRepository
from backend.persistence.repositories.social_repo import SocialRepository
from backend.realtime.publisher import publish_protocol_event
from backend.security.invariants import InvariantViolation


POSITIVE_TERMS = {
    "win",
    "wins",
    "pass",
    "passes",
    "approve",
    "approved",
    "beat",
    "beats",
    "above",
    "higher",
    "yes",
    "launch",
    "record",
    "growth",
}
NEGATIVE_TERMS = {
    "lose",
    "loses",
    "fail",
    "fails",
    "reject",
    "rejected",
    "below",
    "lower",
    "no",
    "delay",
    "cancel",
    "drop",
    "decline",
}
STOP_WORDS = {
    "will",
    "does",
    "this",
    "that",
    "with",
    "from",
    "have",
    "than",
    "market",
    "prediction",
}


@dataclass(frozen=True)
class RiskConfig:
    min_edge_bps: int
    min_confidence_bps: int
    max_trade_wei: int
    max_market_exposure_wei: int
    max_daily_exposure_wei: int
    min_seconds_to_close: int
    risk_tolerance: int


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _clamp_bps(value: float | int) -> int:
    return max(0, min(10_000, int(round(float(value)))))


def _safe_json(value: str) -> dict[str, Any]:
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _parse_metadata(metadata_uri: str) -> dict[str, Any]:
    value = (metadata_uri or "").strip()
    if not value:
        return {}
    if value.startswith("data:") and "," in value:
        _, encoded = value.split(",", 1)
        try:
            return _safe_json(base64.b64decode(encoded).decode("utf-8"))
        except Exception:
            return {}
    return _safe_json(value)


def _market_text(metadata_uri: str) -> tuple[str, str, str]:
    metadata = _parse_metadata(metadata_uri)
    title = str(metadata.get("title") or metadata.get("question") or metadata_uri or "")
    description = str(metadata.get("description") or "")
    category = str(metadata.get("category") or metadata.get("type") or "general")
    return title, description, category


def _keywords(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    return {word for word in words if len(word) >= 4 and word not in STOP_WORDS}


def _probability_from_pools(yes_pool: int, no_pool: int) -> int:
    total = int(yes_pool) + int(no_pool)
    if total <= 0:
        return 5_000
    return _clamp_bps((int(yes_pool) * 10_000) / total)


def _token_amount_to_wei(value: Any) -> int:
    try:
        number = float(value)
    except Exception:
        return 0
    return max(0, int(number * 10**18))


class AutonomousAgentService:
    @staticmethod
    def _risk_config(agent) -> RiskConfig:
        metadata = _parse_metadata(agent.metadata_uri)
        risk_tolerance = int(metadata.get("riskTolerance") or metadata.get("risk_tolerance") or 5)
        risk_tolerance = max(1, min(10, risk_tolerance))
        metadata_max = _token_amount_to_wei(metadata.get("maxExposure"))

        max_trade = _env_int("AGENT_MAX_TRADE_WEI", 0)
        if max_trade <= 0 and metadata_max > 0:
            max_trade = max(1, metadata_max // 10)

        max_market = _env_int("AGENT_MAX_MARKET_EXPOSURE_WEI", 0)
        if max_market <= 0 and metadata_max > 0:
            max_market = metadata_max

        max_daily = _env_int("AGENT_MAX_DAILY_EXPOSURE_WEI", 0)
        if max_daily <= 0 and metadata_max > 0:
            max_daily = metadata_max

        return RiskConfig(
            min_edge_bps=_env_int("AGENT_MIN_EDGE_BPS", 500),
            min_confidence_bps=_env_int("AGENT_MIN_CONFIDENCE_BPS", 900),
            max_trade_wei=max_trade,
            max_market_exposure_wei=max_market,
            max_daily_exposure_wei=max_daily,
            min_seconds_to_close=_env_int("AGENT_MIN_SECONDS_TO_CLOSE", 3600),
            risk_tolerance=risk_tolerance,
        )

    @staticmethod
    async def run_agent_cycle(
        *,
        agent_id: str,
        execute_live: bool = False,
        market_limit: int = 25,
    ) -> dict[str, Any]:
        agent = await AgentRepository.get_by_agent_id(agent_id)
        if not agent:
            raise InvariantViolation("AGENT_NOT_FOUND")
        if not agent.active:
            raise InvariantViolation("AGENT_NOT_ACTIVE")

        if execute_live:
            trader = await ChainReader.autonomous_trader_address()
            if not trader:
                raise InvariantViolation("AUTONOMOUS_AGENT_PRIVATE_KEY_NOT_CONFIGURED")
            if trader.lower() != agent.owner.lower():
                raise InvariantViolation("AUTONOMOUS_TRADER_MUST_MATCH_AGENT_OWNER")

        now = int(time.time())
        markets = await MarketRepository.list_open(now=now, limit=max(1, min(100, market_limit)))
        risk = AutonomousAgentService._risk_config(agent)

        decisions = []
        for market in markets:
            decision = await AutonomousAgentService._decide_market(
                agent=agent,
                market=market,
                risk=risk,
                now=now,
                execute_live=execute_live,
            )
            decisions.append(decision)

        return {
            "agent_id": agent.agent_id,
            "mode": "live" if execute_live else "paper",
            "decisions": decisions,
        }

    @staticmethod
    async def _decide_market(
        *,
        agent,
        market,
        risk: RiskConfig,
        now: int,
        execute_live: bool,
    ) -> dict[str, Any]:
        title, description, category = _market_text(market.metadata_uri)
        yes_pool, no_pool = await MarketRepository.get_market_pools(market.market_id)
        market_probability_bps = _probability_from_pools(yes_pool, no_pool)
        oracle_submissions = await OracleRepository.list_submissions_by_market(market.market_id)
        signals = await AutonomousAgentService._collect_signals(
            market_id=market.market_id,
            title=title,
            description=description,
            category=category,
            market_probability_bps=market_probability_bps,
        )
        model_probability_bps, confidence_bps = AutonomousAgentService._estimate_probability(
            market_probability_bps=market_probability_bps,
            signals=signals,
        )
        yes_edge = model_probability_bps - market_probability_bps
        no_edge = market_probability_bps - model_probability_bps
        side = "YES" if yes_edge >= no_edge else "NO"
        edge_bps = max(yes_edge, no_edge)
        stake_amount = AutonomousAgentService._size_trade(
            edge_bps=max(0, edge_bps),
            risk=risk,
        )

        reason = "READY"
        status = "PAPER"
        if oracle_submissions:
            reason = "ORACLE_ACTIVITY_PRESENT"
            status = "SKIPPED"
            stake_amount = 0
        elif int(market.end_time) - now < risk.min_seconds_to_close:
            reason = "TOO_CLOSE_TO_CLOSE"
            status = "SKIPPED"
            stake_amount = 0
        elif edge_bps < risk.min_edge_bps:
            reason = "EDGE_TOO_SMALL"
            status = "SKIPPED"
            stake_amount = 0
        elif confidence_bps < risk.min_confidence_bps:
            reason = "CONFIDENCE_TOO_LOW"
            status = "SKIPPED"
            stake_amount = 0
        elif stake_amount <= 0:
            reason = "TRADE_SIZE_ZERO"
            status = "SKIPPED"
        elif await AgentPredictionRepository.exposure_for_agent_market(
            agent_id=agent.agent_id,
            market_id=market.market_id,
        ) + stake_amount > risk.max_market_exposure_wei:
            reason = "MARKET_RISK_LIMIT"
            status = "SKIPPED"
            stake_amount = 0
        elif await AgentPredictionRepository.daily_exposure(agent_id=agent.agent_id) + stake_amount > risk.max_daily_exposure_wei:
            reason = "DAILY_RISK_LIMIT"
            status = "SKIPPED"
            stake_amount = 0

        snapshot = {
            "title": title,
            "description": description,
            "category": category,
            "yes_pool": int(yes_pool),
            "no_pool": int(no_pool),
            "market_probability_bps": market_probability_bps,
            "model_probability_bps": model_probability_bps,
            "signals": signals,
            "risk": risk.__dict__,
            "timestamp": now,
        }
        prediction = await AgentPredictionRepository.create_prediction(
            agent_id=agent.agent_id,
            market_id=market.market_id,
            owner=agent.owner,
            side=side,
            model_probability_bps=model_probability_bps,
            market_probability_bps=market_probability_bps,
            confidence_bps=confidence_bps,
            edge_bps=max(0, edge_bps),
            stake_amount=stake_amount,
            status=status,
            reason=reason,
            source_snapshot=snapshot,
        )

        tx_hash: Optional[str] = None
        if status == "PAPER" and execute_live:
            await AgentPredictionRepository.update_execution(
                prediction_id=prediction.prediction_id,
                status="SUBMITTED",
                tx_hash=None,
                reason="SUBMITTING",
            )
            try:
                tx_hash = await ChainReader.place_autonomous_agent_bet(
                    market_address=market.address,
                    side=side,
                    amount=stake_amount,
                )
                from backend.services.market_service import MarketService

                await MarketService.place_bet(
                    user_address=agent.owner,
                    market_id=market.market_id,
                    side=side,
                    amount=stake_amount,
                    tx_hash=tx_hash,
                )
                status = "EXECUTED"
                reason = "EXECUTED"
            except Exception as exc:
                status = "FAILED"
                reason = str(exc)
            await AgentPredictionRepository.update_execution(
                prediction_id=prediction.prediction_id,
                status=status,
                tx_hash=tx_hash,
                reason=reason,
            )

        payload = {
            "prediction_id": prediction.prediction_id,
            "agent_id": agent.agent_id,
            "market_id": market.market_id,
            "side": side,
            "model_probability_bps": model_probability_bps,
            "market_probability_bps": market_probability_bps,
            "confidence_bps": confidence_bps,
            "edge_bps": max(0, edge_bps),
            "stake_amount": int(stake_amount),
            "status": status,
            "reason": reason,
            "tx_hash": tx_hash,
        }
        await publish_protocol_event(
            topic="agents",
            event_type="agent.prediction.created",
            event_key=agent.agent_id,
            payload=payload,
        )
        return payload

    @staticmethod
    async def _collect_signals(
        *,
        market_id: str,
        title: str,
        description: str,
        category: str,
        market_probability_bps: int,
    ) -> dict[str, Any]:
        local_social = await AutonomousAgentService._social_signal(title=title, description=description)
        historical = await AutonomousAgentService._historical_signal(title=title, description=description)
        external = await AutonomousAgentService._external_signals(
            market_id=market_id,
            title=title,
            description=description,
            category=category,
        )
        return {
            "market_baseline_bps": market_probability_bps,
            "social": local_social,
            "historical": historical,
            "external": external,
        }

    @staticmethod
    async def _social_signal(*, title: str, description: str) -> dict[str, Any]:
        terms = _keywords(f"{title} {description}")
        if not terms:
            return {"available": False}
        events = await SocialRepository.list_recent_events(limit=200)
        matched = []
        for event in events:
            content = str(event.content or "")
            event_terms = _keywords(content)
            if not terms.intersection(event_terms):
                continue
            tokens = set(re.findall(r"[a-z0-9]+", content.lower()))
            sentiment_hits = len(tokens.intersection(POSITIVE_TERMS)) - len(tokens.intersection(NEGATIVE_TERMS))
            matched.append(
                {
                    "event_id": event.event_id,
                    "score_bps": int(event.signal_score_bps or 0),
                    "sentiment_hits": sentiment_hits,
                }
            )

        if not matched:
            return {"available": False}

        avg_signal = sum(item["score_bps"] for item in matched) / len(matched)
        avg_sentiment = sum(item["sentiment_hits"] for item in matched) / len(matched)
        sentiment_bps = _clamp_bps(5_000 + avg_sentiment * 700)
        confidence_bps = _clamp_bps(min(3_000, len(matched) * 250) + avg_signal * 0.25)
        return {
            "available": True,
            "probability_bps": sentiment_bps,
            "confidence_bps": confidence_bps,
            "matched_events": len(matched),
        }

    @staticmethod
    async def _historical_signal(*, title: str, description: str) -> dict[str, Any]:
        terms = _keywords(f"{title} {description}")
        if not terms:
            return {"available": False}

        markets = await MarketRepository.list_settled(limit=500)
        matches = []
        for market in markets:
            other_title, other_description, _ = _market_text(market.metadata_uri)
            if terms.intersection(_keywords(f"{other_title} {other_description}")):
                matches.append(bool(market.final_outcome))

        if len(matches) < 3:
            return {"available": False, "matched_markets": len(matches)}

        yes_rate = sum(1 for outcome in matches if outcome) / len(matches)
        return {
            "available": True,
            "probability_bps": _clamp_bps(yes_rate * 10_000),
            "confidence_bps": _clamp_bps(min(2_500, len(matches) * 200)),
            "matched_markets": len(matches),
        }

    @staticmethod
    async def _external_signals(
        *,
        market_id: str,
        title: str,
        description: str,
        category: str,
    ) -> list[dict[str, Any]]:
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
                            "market_id": market_id,
                            "title": title,
                            "description": description,
                            "category": category,
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
                signals.append(
                    {
                        "source": str(payload.get("source") or endpoint),
                        "probability_bps": _clamp_bps(probability),
                        "confidence_bps": _clamp_bps(payload.get("confidence_bps") or 1_000),
                    }
                )
        return signals

    @staticmethod
    def _estimate_probability(*, market_probability_bps: int, signals: dict[str, Any]) -> tuple[int, int]:
        weighted = [(market_probability_bps, 1_000)]
        confidence_inputs = []

        for key in ("social", "historical"):
            signal = signals.get(key) or {}
            if signal.get("available"):
                confidence = _clamp_bps(signal.get("confidence_bps") or 0)
                weighted.append((_clamp_bps(signal.get("probability_bps") or market_probability_bps), confidence))
                confidence_inputs.append(confidence)

        for signal in signals.get("external") or []:
            confidence = _clamp_bps(signal.get("confidence_bps") or 0)
            weighted.append((_clamp_bps(signal.get("probability_bps") or market_probability_bps), confidence))
            confidence_inputs.append(confidence)

        total_weight = sum(weight for _, weight in weighted)
        probability = sum(probability * weight for probability, weight in weighted) / max(total_weight, 1)
        confidence_bps = max(confidence_inputs) if confidence_inputs else 0
        confidence_bps = max(confidence_bps, abs(probability - 5_000) * 2)
        return _clamp_bps(probability), _clamp_bps(confidence_bps)

    @staticmethod
    def _size_trade(*, edge_bps: int, risk: RiskConfig) -> int:
        if risk.max_trade_wei <= 0 or risk.max_market_exposure_wei <= 0 or risk.max_daily_exposure_wei <= 0:
            return 0
        edge_scale = max(0.05, min(1.0, edge_bps / 2_000))
        risk_scale = risk.risk_tolerance / 10
        return max(1, int(risk.max_trade_wei * edge_scale * risk_scale))

    @staticmethod
    async def list_predictions(agent_id: str, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
        rows = await AgentPredictionRepository.list_by_agent(agent_id, limit=limit, offset=offset)
        return [AutonomousAgentService._prediction_payload(row) for row in rows]

    @staticmethod
    async def performance(agent_id: str) -> dict[str, Any]:
        agent = await AgentRepository.get_by_agent_id(agent_id)
        if not agent:
            raise InvariantViolation("AGENT_NOT_FOUND")
        return await AgentPredictionRepository.performance(agent_id)

    @staticmethod
    def _prediction_payload(row) -> dict[str, Any]:
        return {
            "prediction_id": row.prediction_id,
            "agent_id": row.agent_id,
            "market_id": row.market_id,
            "owner": row.owner,
            "side": row.side,
            "model_probability_bps": int(row.model_probability_bps),
            "market_probability_bps": int(row.market_probability_bps),
            "confidence_bps": int(row.confidence_bps),
            "edge_bps": int(row.edge_bps),
            "stake_amount": int(row.stake_amount or 0),
            "status": row.status,
            "reason": row.reason,
            "tx_hash": row.tx_hash,
            "metrics": row.metrics_json or {},
            "settled_outcome": row.settled_outcome,
            "created_at": row.created_at.isoformat(),
        }
