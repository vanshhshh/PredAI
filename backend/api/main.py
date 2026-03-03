# File: backend/api/main.py
"""
Primary FastAPI application entrypoint.

This module handles:
- application bootstrap and router wiring
- startup/shutdown lifecycle
- CORS configuration
- structured error handling middleware
- health/readiness endpoints
"""

from __future__ import annotations

import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.agents import router as agents_router
from backend.api.ai import router as ai_router
from backend.api.auth import router as auth_router
from backend.api.governance import router as governance_router
from backend.api.markets import router as markets_router
from backend.api.oracles import router as oracles_router
from backend.api.rwa import router as rwa_router
from backend.api.social import router as social_router
from backend.api.users import router as users_router
from backend.api.yield_api import router as yield_router
from backend.persistence.db import close_db, init_db, ping_db
from backend.security.invariants import InvariantViolation
from backend.security.rate_limits import RateLimitMiddleware


APP_NAME = "AI-Crypto Prediction Platform API"
APP_VERSION = "1.0.0"


def _cors_origins() -> list[str]:
    """
    Resolve CORS origins from env for frontend integration.
    """
    raw = os.getenv("CORS_ORIGINS", "")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def _error_payload(
    *,
    code: str,
    message: Any,
    request: Request,
) -> dict[str, Any]:
    return {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "request_id": getattr(request.state, "request_id", None),
            "path": request.url.path,
            "method": request.method,
            "timestamp_ms": int(time.time() * 1000),
        },
    }


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Startup: initialize DB and ORM metadata.
    await init_db()
    try:
        yield
    finally:
        # Shutdown: cleanly dispose DB pools/connections.
        await close_db()


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)


@app.middleware("http")
async def structured_error_middleware(request: Request, call_next):
    """
    Global middleware that:
    - assigns per-request correlation IDs
    - emits consistent JSON for unhandled exceptions
    """
    request.state.request_id = str(uuid.uuid4())
    request.state.started_at = time.time()

    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        return response
    except Exception:
        payload = _error_payload(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected error occurred.",
            request=request,
        )
        return JSONResponse(status_code=500, content=payload)


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware)


app.include_router(markets_router, prefix="/markets", tags=["markets"])
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(agents_router, prefix="/agents", tags=["agents"])
app.include_router(oracles_router, prefix="/oracles", tags=["oracles"])
app.include_router(yield_router, prefix="/yield", tags=["yield"])
app.include_router(governance_router, prefix="/governance", tags=["governance"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(ai_router, prefix="/ai", tags=["ai"])
app.include_router(social_router, prefix="/social", tags=["social"])
app.include_router(rwa_router, prefix="/rwa", tags=["rwa"])


@app.exception_handler(InvariantViolation)
async def invariant_violation_handler(
    request: Request, exc: InvariantViolation
):
    return JSONResponse(
        status_code=400,
        content=_error_payload(
            code="INVARIANT_VIOLATION",
            message=exc.to_dict(),
            request=request,
        ),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
):
    return JSONResponse(
        status_code=422,
        content=_error_payload(
            code="VALIDATION_ERROR",
            message=exc.errors(),
            request=request,
        ),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_payload(
            code="HTTP_ERROR",
            message=exc.detail,
            request=request,
        ),
    )


@app.get("/health", tags=["system"])
async def health_check():
    """
    Liveness/readiness probe.
    Returns 503 when DB is unavailable.
    """
    db_ok = await ping_db()
    if not db_ok:
        return JSONResponse(
            status_code=503,
            content={
                "status": "degraded",
                "service": APP_NAME,
                "version": APP_VERSION,
                "database": "down",
            },
        )

    return {
        "status": "ok",
        "service": APP_NAME,
        "version": APP_VERSION,
        "database": "up",
    }
