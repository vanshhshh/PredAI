"""
PURPOSE
-------
HTTP service wrapper for AI inference.

This module:
- exposes inference via HTTP
- runs deterministic allocation heuristics
- returns calibrated confidence scores
- is safe to scale horizontally
"""

from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from ai.inference.runner import InferenceRunner


app = FastAPI(title="AI Inference Service", version="1.0.0")


class Position(BaseModel):
    vault_id: str
    amount: float
    apy_bps: int = 0
    risk_score: int = 0


class RecommendationRequest(BaseModel):
    positions: List[Position]
    target_risk_score: int = Field(..., gt=0)


class HeuristicModel:
    """
    Deterministic scoring model used for runtime recommendations.
    """

    def __init__(self) -> None:
        self.state: Dict[str, Any] = {}

    def load_state(self, state: Dict[str, Any]) -> None:
        self.state = state

    def predict(self, features: Dict[str, Any]) -> float:
        positions = features.get("positions", [])
        target = max(float(features.get("target_risk_score", 1)), 1.0)
        if not positions:
            return 0.5

        total_amount = sum(max(float(p.get("amount", 0.0)), 0.0) for p in positions)
        total_amount = total_amount if total_amount > 0 else float(len(positions))

        weighted_risk = 0.0
        for p in positions:
            amount = max(float(p.get("amount", 0.0)), 0.0) or 1.0
            weighted_risk += amount * float(p.get("risk_score", 0))

        weighted_risk /= total_amount
        distance = abs(weighted_risk - target) / target

        return max(0.0, min(1.0, 1.0 - distance))


def _compute_allocation(
    positions: List[Position],
    target_risk_score: int,
) -> List[Dict[str, Any]]:
    if not positions:
        return []

    scores: List[float] = []
    for position in positions:
        risk_gap = abs(float(position.risk_score) - float(target_risk_score))
        apy_component = max(float(position.apy_bps), 0.0) + 1.0
        score = apy_component / (1.0 + risk_gap)
        scores.append(score)

    score_sum = sum(scores)
    if score_sum <= 0:
        normalized = [1.0 / len(positions)] * len(positions)
    else:
        normalized = [s / score_sum for s in scores]

    total_amount = sum(max(position.amount, 0.0) for position in positions)

    allocation: List[Dict[str, Any]] = []
    for position, weight in zip(positions, normalized):
        allocation.append(
            {
                "vault_id": position.vault_id,
                "weight": round(weight, 6),
                "recommended_amount": round(total_amount * weight, 6),
                "risk_score": position.risk_score,
            }
        )
    return allocation


MODEL_STATE: Dict[str, Any] = {}
MODEL = HeuristicModel()
RUNNER = InferenceRunner(model=MODEL, model_state=MODEL_STATE)


@app.post("/recommend")
async def recommend(payload: RecommendationRequest):
    """
    Compute allocation recommendation.
    """
    try:
        features = {
            "positions": [position.model_dump() for position in payload.positions],
            "target_risk_score": payload.target_risk_score,
        }

        result = RUNNER.run(features)
        allocation = _compute_allocation(
            positions=payload.positions,
            target_risk_score=payload.target_risk_score,
        )

        expected_risk = 0.0
        if allocation:
            expected_risk = sum(item["weight"] * item["risk_score"] for item in allocation)

        return {
            "allocation": allocation,
            "probability": result["probability"],
            "confidence": result["confidence"],
            "target_risk_score": payload.target_risk_score,
            "expected_risk_score": round(expected_risk, 4),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail="INFERENCE_FAILED") from exc


@app.get("/health")
async def health():
    return {"status": "ok"}
