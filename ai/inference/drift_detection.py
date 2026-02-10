# File: ai/inference/drift_detection.py
"""
PURPOSE
-------
Model drift detection utilities.

This module:
- detects distributional drift between training and live data
- flags when model confidence should be discounted
- provides deterministic drift scores for monitoring & governance

DESIGN RULES (from docs)
------------------------
- No model training or mutation
- No network or IO
- Deterministic math only
- Conservative thresholds (prefer false positives over misses)
"""

from typing import Dict, List
import math


def _mean(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _variance(values: List[float], mean: float) -> float:
    return sum((v - mean) ** 2 for v in values) / len(values) if values else 0.0


def compute_feature_drift(
    *,
    baseline: Dict[str, List[float]],
    current: Dict[str, List[float]],
) -> Dict[str, float]:
    """
    Compute per-feature drift score using normalized variance shift.

    Args:
        baseline: feature -> list of historical values
        current: feature -> list of live values

    Returns:
        feature -> drift score (0.0 = no drift, higher = more drift)
    """
    drift_scores: Dict[str, float] = {}

    for feature, base_values in baseline.items():
        curr_values = current.get(feature)
        if not curr_values or not base_values:
            drift_scores[feature] = 0.0
            continue

        base_mean = _mean(base_values)
        curr_mean = _mean(curr_values)

        base_var = _variance(base_values, base_mean)
        curr_var = _variance(curr_values, curr_mean)

        # Mean shift
        mean_shift = abs(curr_mean - base_mean)

        # Variance shift (avoid div by zero)
        var_shift = abs(curr_var - base_var) / (base_var + 1e-9)

        drift_scores[feature] = mean_shift + var_shift

    return drift_scores


def aggregate_drift(drift_scores: Dict[str, float]) -> float:
    """
    Aggregate feature-level drift into a single scalar score.

    Uses RMS to penalize large deviations.
    """
    if not drift_scores:
        return 0.0

    squared = [v * v for v in drift_scores.values()]
    return math.sqrt(sum(squared) / len(squared))
