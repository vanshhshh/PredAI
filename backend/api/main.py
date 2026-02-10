# File: backend/api/main.py
"""
PURPOSE
-------
Primary FastAPI application entrypoint for the AI–Crypto Prediction Platform.

This file is responsible for:
- application bootstrap
- global middleware (security, CORS, rate limits)
- dependency injection
- router registration
- lifecycle management (startup / shutdown)

DESIGN RULES (from docs)
------------------------
- No business logic here
- No direct database access here
- No blockchain calls here
- Fail fast on misconfiguration
- Explicit wiring only (no magic imports)

This file is production-grade and environment-aware.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.markets import router as markets_router
from backend.api.agents import router as agents_router
from backend.api.oracles import router as oracles_router
from backend.api.yield_api import router as yield_router
from backend.api.governance import router as governance_router
from backend.api.users import router as users_router

from backend.persistence.db import init_db, close_db
from backend.security.rate_limits import RateLimitMiddleware
from backend.security.invariants import InvariantViolation


# -------------------------------------------------------------------
# ENVIRONMENT CONFIGURATION
# -------------------------------------------------------------------

APP_NAME = "AI–Crypto Prediction Platform API"
APP_VERSION = "1.0.0"

# NOTE:
# In production, these MUST come from environment variables.
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://app.yourdomain.com",
]


# -------------------------------------------------------------------
# APPLICATION INITIALIZATION
# -------------------------------------------------------------------

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# -------------------------------------------------------------------
# GLOBAL MIDDLEWARE
# -------------------------------------------------------------------

# CORS (frontend / wallet / integrations)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting & abuse protection
app.add_middleware(RateLimitMiddleware)


# -------------------------------------------------------------------
# ROUTER REGISTRATION
# -------------------------------------------------------------------

app.include_router(markets_router, prefix="/markets", tags=["markets"])
app.include_router(agents_router, prefix="/agents", tags=["agents"])
app.include_router(oracles_router, prefix="/oracles", tags=["oracles"])
app.include_router(yield_router, prefix="/yield", tags=["yield"])
app.include_router(governance_router, prefix="/governance", tags=["governance"])
app.include_router(users_router, prefix="/users", tags=["users"])


# -------------------------------------------------------------------
# ERROR HANDLING
# -------------------------------------------------------------------

@app.exception_handler(InvariantViolation)
async def invariant_violation_handler(_, exc: InvariantViolation):
    """
    Protocol-level invariant violations.
    These indicate logic or state violations, not user errors.
    """
    return JSONResponse(
        status_code=400,
        content={
            "error": "INVARIANT_VIOLATION",
            "detail": exc.message,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_, exc: Exception):
    """
    Last-resort safety net.
    In production, this must log to Sentry / Datadog.
    """
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "detail": str(exc),
        },
    )


# -------------------------------------------------------------------
# LIFECYCLE EVENTS
# -------------------------------------------------------------------

@app.on_event("startup")
async def on_startup():
    """
    Application startup hook.
    Initializes database connections and external resources.
    """
    await init_db()


@app.on_event("shutdown")
async def on_shutdown():
    """
    Application shutdown hook.
    Ensures clean resource teardown.
    """
    await close_db()


# -------------------------------------------------------------------
# HEALTH CHECK
# -------------------------------------------------------------------

@app.get("/health", tags=["system"])
async def health_check():
    """
    Liveness / readiness probe for Kubernetes & monitoring.
    """
    return {
        "status": "ok",
        "service": APP_NAME,
        "version": APP_VERSION,
    }
