"""
PURPOSE
-------
HTTP service wrapper for AI inference.

This module:
- exposes inference via HTTP
- delegates ALL logic to InferenceRunner
- performs zero business logic
- is safe to scale horizontally

DESIGN RULES
------------
- No training
- No DB access
- No blockchain calls
- Thin transport layer only
"""

from fastapi import FastAPI, HTTPException
from typing import Dict, Any

from ai.inference.runner import InferenceRunner
from ai.inference.confidence import calibrate_confidence


# ------------------------------------------------------------------
# APP
# ------------------------------------------------------------------

app = FastAPI(title="AI Inference Service", version="1.0.0")


# ------------------------------------------------------------------
# MODEL BOOTSTRAP (stub for now)
# ------------------------------------------------------------------

class DummyModel:
    def load_state(self, state):
        pass

    def predict(self, features):
        # deterministic placeholder
        return 0.65


MODEL_STATE = {}
MODEL = DummyModel()

runner = InferenceRunner(
    model=MODEL,
    model_state=MODEL_STATE,
)


# ------------------------------------------------------------------
# ENDPOINTS
# ------------------------------------------------------------------

@app.post("/recommend")
async def recommend(payload: Dict[str, Any]):
    """
    Compute allocation recommendation.

    Expected payload:
    {
        "positions": [...],
        "target_risk_score": int
    }
    """
    try:
        features = {
            "positions": payload["positions"],
            "target_risk_score": payload["target_risk_score"],
        }

        result = runner.run(features)

        return {
            "allocation": payload["positions"],  # placeholder
            "probability": result["probability"],
            "confidence": result["confidence"],
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="INFERENCE_FAILED",
        ) from exc
