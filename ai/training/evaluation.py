# File: ai/training/evaluation.py
"""
PURPOSE
-------
Model evaluation and backtesting utilities.

This module:
- evaluates trained models on held-out datasets
- computes standardized performance metrics
- supports deterministic backtesting
- produces audit-friendly evaluation reports

DESIGN RULES (from docs)
------------------------
- No training here
- No network or filesystem IO
- Deterministic given inputs
- Metric definitions are explicit and stable
"""

from typing import Dict, Any
import math

from ai.training.datasets import Dataset


class EvaluationResult:
    """
    Immutable container for evaluation outputs.
    """

    def __init__(
        self,
        *,
        metrics: Dict[str, float],
        dataset_version: str,
    ):
        self.metrics = metrics
        self.dataset_version = dataset_version


# -------------------------------------------------------------------
# METRICS
# -------------------------------------------------------------------

def accuracy(predictions: list[int], labels: list[int]) -> float:
    if not predictions:
        return 0.0
    correct = sum(1 for p, y in zip(predictions, labels) if p == y)
    return correct / len(predictions)


def brier_score(predictions: list[float], labels: list[int]) -> float:
    if not predictions:
        return 0.0
    return sum((p - y) ** 2 for p, y in zip(predictions, labels)) / len(predictions)


# -------------------------------------------------------------------
# EVALUATION
# -------------------------------------------------------------------

def evaluate_model(
    *,
    model: Any,
    dataset: Dataset,
) -> EvaluationResult:
    """
    Evaluate a trained model against a dataset.

    Assumes:
    - model.predict(features) → probability in [0,1]
    """

    probs = []
    preds = []
    labels = []

    for sample in dataset.samples:
        prob = float(model.predict(sample.features))
        probs.append(prob)
        preds.append(1 if prob >= 0.5 else 0)
        labels.append(sample.label)

    metrics = {
        "accuracy": accuracy(preds, labels),
        "brier_score": brier_score(probs, labels),
    }

    return EvaluationResult(
        metrics=metrics,
        dataset_version=dataset.version,
    )
