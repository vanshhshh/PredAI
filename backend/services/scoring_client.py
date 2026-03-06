"""
Agent scoring adapter.

Scoring is computed locally using Rust bindings when available, with a
deterministic Python fallback that mirrors the Rust formula.
"""

from __future__ import annotations

from typing import Final


_MAX_SCORE_BPS: Final[int] = 10_000


def _clamp_non_negative(value: int) -> int:
    return max(0, int(value))


def _compute_score_python(
    *,
    correct_predictions: int,
    total_predictions: int,
    recent_accuracy_bps: int,
) -> int:
    if total_predictions <= 0:
        return 0

    base_accuracy_bps = (correct_predictions * _MAX_SCORE_BPS) // total_predictions
    weighted_score = (base_accuracy_bps * 6 + recent_accuracy_bps * 4) // 10
    return min(_MAX_SCORE_BPS, max(0, int(weighted_score)))


async def score_agent(
    *,
    correct_predictions: int,
    total_predictions: int,
    recent_accuracy_bps: int,
) -> int:
    """
    Compute normalized agent score in basis points [0..10_000].
    """
    correct = _clamp_non_negative(correct_predictions)
    total = _clamp_non_negative(total_predictions)
    recent = min(_MAX_SCORE_BPS, _clamp_non_negative(recent_accuracy_bps))

    if total == 0:
        return 0

    try:
        import rust_core  # type: ignore

        score = rust_core.compute_agent_score(correct, total, recent)
        return min(_MAX_SCORE_BPS, max(0, int(score)))
    except Exception:
        return _compute_score_python(
            correct_predictions=correct,
            total_predictions=total,
            recent_accuracy_bps=recent,
        )
