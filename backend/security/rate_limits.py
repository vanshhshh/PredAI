# File: backend/security/rate_limits.py
"""
PURPOSE
-------
Centralized rate-limiting utilities for the backend API.

This module:
- defines reusable rate-limit dependencies
- protects critical endpoints from abuse
- is compatible with async FastAPI usage
- keeps policy explicit and configurable

DESIGN RULES (from docs)
------------------------
- Rate limits are defensive, not business logic
- No user funds or state changes here
- Fail closed when limits are exceeded
- Configuration via environment variables
"""

import time
import os
from typing import Dict

from fastapi import HTTPException, status
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# -------------------------------------------------------------------
# CONFIG
# -------------------------------------------------------------------

DEFAULT_WINDOW_SECONDS = int(
    os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60")
)

DEFAULT_MAX_REQUESTS = int(
    os.getenv("RATE_LIMIT_MAX_REQUESTS", "100")
)


# -------------------------------------------------------------------
# IN-MEMORY STORE (PLACEHOLDER)
# -------------------------------------------------------------------
# NOTE:
# In production, replace this with Redis or another shared store.

_request_counters: Dict[str, Dict[str, int]] = {}


# -------------------------------------------------------------------
# RATE LIMIT LOGIC
# -------------------------------------------------------------------

def _current_window() -> int:
    return int(time.time() // DEFAULT_WINDOW_SECONDS)


def check_rate_limit(
    *,
    key: str,
    max_requests: int = DEFAULT_MAX_REQUESTS,
):
    """
    Check and enforce rate limit for a given key.

    Args:
        key: unique identifier (e.g., user address or IP)
        max_requests: maximum allowed requests per window
    """
    window = _current_window()

    if key not in _request_counters:
        _request_counters[key] = {"window": window, "count": 0}

    entry = _request_counters[key]

    if entry["window"] != window:
        entry["window"] = window
        entry["count"] = 0

    entry["count"] += 1

    if entry["count"] > max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="RATE_LIMIT_EXCEEDED",
        )


# -------------------------------------------------------------------
# FASTAPI DEPENDENCY
# -------------------------------------------------------------------

def rate_limiter(
    *,
    key: str,
    max_requests: int = DEFAULT_MAX_REQUESTS,
):
    """
    FastAPI dependency wrapper for rate limiting.
    """
    def _limiter():
        check_rate_limit(key=key, max_requests=max_requests)
    return _limiter

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            key = request.client.host if request.client else "unknown"
            check_rate_limit(key=key)
            return await call_next(request)
        except HTTPException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
            )