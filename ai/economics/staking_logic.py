# File: ai/economics/staking_logic.py
"""
PURPOSE
-------
Canonical staking logic for AI agents and oracles.

This module:
- defines how stake affects rewards and risk
- computes effective stake used in scoring and consensus
- is shared across training, inference, and backend services

DESIGN RULES (from docs)
------------------------
- Pure computation only
- No blockchain or database access
- Deterministic outputs
- Conservative by default (discourage over-leverage)
"""

from typing import Dict


def compute_effective_stake(
    *,
    raw_stake: int,
    lockup_seconds: int,
    min_lockup_seconds: int,
) -> int:
    """
    Compute effective stake based on lockup duration.

    Philosophy:
    - Longer lockups earn higher effective stake
    - Short lockups are discounted
    - Prevents stake hopping

    Args:
        raw_stake: nominal staked amount
        lockup_seconds: actual lockup duration
        min_lockup_seconds: protocol minimum lockup

    Returns:
        effective_stake: adjusted stake used in scoring/consensus
    """
    if raw_stake <= 0:
        return 0

    if lockup_seconds <= 0 or min_lockup_seconds <= 0:
        return 0

    ratio = min(lockup_seconds / min_lockup_seconds, 2.0)

    return int(raw_stake * ratio)


def compute_reward_share(
    *,
    effective_stake: int,
    total_effective_stake: int,
) -> float:
    """
    Compute reward share based on effective stake.

    Returns:
        fraction of rewards in [0,1]
    """
    if total_effective_stake <= 0:
        return 0.0

    return effective_stake / total_effective_stake
