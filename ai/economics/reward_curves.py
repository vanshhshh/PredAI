# File: ai/economics/reward_curves.py
"""
PURPOSE
-------
Canonical reward curve definitions for agents and oracles.

This module:
- defines how rewards scale with performance and stake
- discourages extreme risk-taking
- smooths reward volatility over time
- is used by backend services and simulations

DESIGN RULES (from docs)
------------------------
- Pure math only
- No external state
- Deterministic and monotonic
- Rewards saturate (no runaway incentives)
"""

import math


def linear_reward(
    *,
    performance_score: float,
    stake_share: float,
) -> float:
    """
    Linear reward curve.

    Args:
        performance_score: normalized [0,1]
        stake_share: fraction of total effective stake [0,1]

    Returns:
        reward multiplier
    """
    performance_score = max(0.0, min(1.0, performance_score))
    stake_share = max(0.0, min(1.0, stake_share))

    return performance_score * stake_share


def sigmoid_reward(
    *,
    performance_score: float,
    stake_share: float,
    k: float = 6.0,
) -> float:
    """
    Sigmoid reward curve.

    Philosophy:
    - Strongly rewards consistent high performers
    - Dampens low-signal noise
    - Prevents single lucky outcomes from dominating

    Args:
        performance_score: normalized [0,1]
        stake_share: fraction of total effective stake [0,1]
        k: steepness parameter

    Returns:
        reward multiplier
    """
    performance_score = max(0.0, min(1.0, performance_score))
    stake_share = max(0.0, min(1.0, stake_share))

    sigmoid = 1.0 / (1.0 + math.exp(-k * (performance_score - 0.5)))

    return sigmoid * stake_share


def capped_reward(
    *,
    base_reward: float,
    cap: float,
) -> float:
    """
    Cap rewards to a maximum value.

    Prevents runaway payouts.
    """
    return min(base_reward, cap)
