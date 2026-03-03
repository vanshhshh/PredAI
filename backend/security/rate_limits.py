"""
Centralized rate limiting using Upstash Redis REST counters.
"""

from __future__ import annotations

import os
import time
from urllib.parse import quote

import httpx
from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


DEFAULT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
DEFAULT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "100"))
UPSTASH_REDIS_REST_URL = os.getenv("UPSTASH_REDIS_REST_URL", "").rstrip("/")
UPSTASH_REDIS_REST_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")
UPSTASH_TIMEOUT_SECONDS = float(os.getenv("RATE_LIMIT_REDIS_TIMEOUT_SECONDS", "2.5"))
RATE_LIMIT_FAIL_OPEN = os.getenv("RATE_LIMIT_FAIL_OPEN", "true").lower() == "true"


def _current_window() -> int:
    return int(time.time() // DEFAULT_WINDOW_SECONDS)


def _safe_key(value: str) -> str:
    return quote(value.strip().lower(), safe=":_-")


async def _upstash_command(path: str):
    if not UPSTASH_REDIS_REST_URL or not UPSTASH_REDIS_REST_TOKEN:
        if RATE_LIMIT_FAIL_OPEN:
            return None
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RATE_LIMIT_BACKEND_NOT_CONFIGURED",
        )

    headers = {"Authorization": f"Bearer {UPSTASH_REDIS_REST_TOKEN}"}
    url = f"{UPSTASH_REDIS_REST_URL}/{path}"

    try:
        async with httpx.AsyncClient(timeout=UPSTASH_TIMEOUT_SECONDS) as client:
            response = await client.post(url, headers=headers)
            response.raise_for_status()
            payload = response.json()
            return payload.get("result")
    except HTTPException:
        raise
    except Exception as exc:
        if RATE_LIMIT_FAIL_OPEN:
            return None
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RATE_LIMIT_BACKEND_UNAVAILABLE",
        ) from exc


async def check_rate_limit(
    *,
    key: str,
    max_requests: int = DEFAULT_MAX_REQUESTS,
) -> None:
    window = _current_window()
    redis_key = f"ratelimit:{_safe_key(key)}:{window}"

    count_raw = await _upstash_command(f"incr/{redis_key}")
    if count_raw is None:
        return
    count = int(count_raw or 0)

    if count == 1:
        await _upstash_command(f"expire/{redis_key}/{DEFAULT_WINDOW_SECONDS + 1}")

    if count > max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="RATE_LIMIT_EXCEEDED",
        )


def rate_limiter(
    *,
    key: str | None = None,
    max_requests: int = DEFAULT_MAX_REQUESTS,
):
    async def _limiter(request: Request):
        derived_key = key or (request.client.host if request.client else "unknown")
        await check_rate_limit(key=derived_key, max_requests=max_requests)

    return _limiter


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in {"/health", "/docs", "/openapi.json", "/redoc"}:
            return await call_next(request)

        try:
            key = request.client.host if request.client else "unknown"
            await check_rate_limit(key=key)
            return await call_next(request)
        except HTTPException as exc:
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
            )
