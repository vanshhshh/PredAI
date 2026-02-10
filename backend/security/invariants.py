# File: backend/security/invariants.py
"""
PURPOSE
-------
Canonical invariant and protocol-violation definitions.

This module:
- defines the single exception type used for invariant violations
- centralizes protocol error codes
- ensures deterministic failure semantics across the system

DESIGN RULES (from docs)
------------------------
- Invariants represent protocol-level truths
- Violations are explicit and fail-fast
- No side effects in this module
- Used across services, indexing, and security layers
"""

from typing import Optional


class InvariantViolation(Exception):
    """
    Raised when a protocol invariant is violated.

    Attributes:
        code: machine-readable invariant code
        message: optional human-readable explanation
    """

    def __init__(self, code: str, message: Optional[str] = None):
        self.code = code
        self.message = message or code
        super().__init__(self.message)

    def to_dict(self) -> dict:
        """
        Serialize invariant for structured logging / APIs.
        """
        return {
            "code": self.code,
            "message": self.message,
        }


# -------------------------------------------------------------------
# COMMON INVARIANT CODES (DOCUMENTATION / REFERENCE)
# -------------------------------------------------------------------
# NOTE:
# These are NOT enforced here; they are defined for consistency.
# Services are free to introduce additional codes if documented.

# AUTH / ACCESS
INVALID_AUTH_TOKEN = "INVALID_AUTH_TOKEN"
INVALID_SIGNATURE = "INVALID_SIGNATURE"
GOVERNANCE_REQUIRED = "GOVERNANCE_REQUIRED"

# MARKET
MARKET_ID_ALREADY_EXISTS = "MARKET_ID_ALREADY_EXISTS"
MARKET_NOT_FOUND = "MARKET_NOT_FOUND"
MARKET_ALREADY_SETTLED = "MARKET_ALREADY_SETTLED"
INVALID_TIME_RANGE = "INVALID_TIME_RANGE"

# AGENT
AGENT_ID_ALREADY_EXISTS = "AGENT_ID_ALREADY_EXISTS"
AGENT_NOT_FOUND = "AGENT_NOT_FOUND"
AGENT_ALREADY_ACTIVE = "AGENT_ALREADY_ACTIVE"
AGENT_ALREADY_INACTIVE = "AGENT_ALREADY_INACTIVE"

# ORACLE
ORACLE_ID_ALREADY_EXISTS = "ORACLE_ID_ALREADY_EXISTS"
ORACLE_NOT_FOUND = "ORACLE_NOT_FOUND"
ORACLE_INACTIVE = "ORACLE_INACTIVE"

# YIELD
INVALID_TARGET_RISK = "INVALID_TARGET_RISK"
NO_VALID_ALLOCATION = "NO_VALID_ALLOCATION"

# USER
USER_NOT_FOUND = "USER_NOT_FOUND"
