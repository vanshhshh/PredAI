# File: ai/economics/slashing_logic.py
"""
PURPOSE
-------
Canonical slashing logic for AI agents and oracles.

This module:
- defines deterministic penalty calculations
- maps protocol violations to stake slashing
- is shared by backend services and governance simulation
- NEVER performs slashing itself (pure computation)

DESIGN RULES (from docs)
------------------------
- Pure computation only
- No blockchain or database access
- Deterministic and auditable
- Slashing is proportional, never absolute unless specified
"""

from typing import Literal


ViolationType = Literal[
    "INCORRECT_PREDICTION",
    "MISSED_SUBMISSION",
    "MALICIOUS_BEHAVIOR",
    "CONSENSUS_DEVIATION",
]


def compute_slash_fraction(
    *,
    violation: ViolationType,
    severity: float,
) -> float:
    """
    Compute fraction of stake to be slashed.

    Args:
        violation: type of protocol violation
        severity: normalized severity in [0,1]

    Returns:
        slash_fraction: value in [0,1]
    """
    if severity <= 0:
        return 0.0

    severity = min(severity, 1.0)

    if violation == "INCORRECT_PREDICTION":
        # Mild penalty, scaled by severity
        return 0.01 * severity

    if violation == "MISSED_SUBMISSION":
        return 0.02 * severity

    if violation == "CONSENSUS_DEVIATION":
        return 0.05 * severity

    if violation == "MALICIOUS_BEHAVIOR":
        # Hard slash
        return 0.5 * severity

    return 0.0


def apply_slash(
    *,
    current_stake: int,
    slash_fraction: float,
) -> int:
    """
    Apply slash fraction to stake.

    Returns:
        remaining stake (never negative)
    """
    if current_stake <= 0:
        return 0

    if slash_fraction <= 0:
        return current_stake

    slashed = int(current_stake * slash_fraction)
    remaining = current_stake - slashed

    return max(remaining, 0)
