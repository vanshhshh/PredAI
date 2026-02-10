# File: ai/inference/runner.py
"""
PURPOSE
-------
Unified inference runner for deployed AI models.

This module:
- loads a trained model state
- runs inference deterministically
- applies confidence calibration hooks
- is used by agents and backend services
  
DESIGN RULES (from docs)
------------------------
- No training here
- No network calls
- Deterministic given (model_state, input)
- Stateless except for loaded model
"""

from typing import Any, Dict

from ai.inference.confidence import calibrate_confidence


class InferenceRunner:
    """
    Wrapper around a trained model for inference-time execution.
    """

    def __init__(self, *, model: Any, model_state: Dict[str, Any]):
        self.model = model
        self.model.load_state(model_state)

    def run(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run inference and return normalized output.

        Returns:
            {
                "probability": float,
                "confidence": float
            }
        """
        raw_prob = float(self.model.predict(features))
        confidence = calibrate_confidence(raw_prob)

        return {
            "probability": raw_prob,
            "confidence": confidence,
        }
