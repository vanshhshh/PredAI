# File: ai/inference/confidence.py
"""
PURPOSE
-------
Confidence calibration utilities for inference outputs.

This module:
- converts raw model probabilities into calibrated confidence scores
- ensures conservative confidence reporting
- standardizes confidence semantics across all agents and models

DESIGN RULES (from docs)
------------------------
- Pure math only
- No model access
- No IO or side effects
- Deterministic mapping
"""

import math


def calibrate_confidence(probability: float) -> float:
    """
    Calibrate raw probability into a confidence score in [0,1].

    Philosophy:
    - Confidence reflects distance from uncertainty (0.5)
    - Extreme probabilities get diminishing returns
    - Prevents overconfident agents

    Args:
        probability: raw model probability in [0,1]

    Returns:
        confidence: calibrated confidence in [0,1]
    """
    if probability < 0.0 or probability > 1.0:
        raise ValueError("PROBABILITY_OUT_OF_RANGE")

    # Distance from uncertainty
    distance = abs(probability - 0.5) * 2.0  # [0,1]

    # Smooth with sigmoid-like curve (but deterministic, cheap)
    confidence = distance / (1.0 + distance)

    return confidence
