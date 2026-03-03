"""
Production async database bootstrap and session management.

This module provides:
- async SQLAlchemy engine for PostgreSQL
- async session factory for repositories
- startup/shutdown hooks for FastAPI lifecycle
- health probe helper to verify DB connectivity
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator, AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base


def _build_database_url() -> str:
    """
    Normalize DATABASE_URL to the SQLAlchemy asyncpg format.
    """
    raw_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://predai:predai@db:5432/predai",
    )

    # Render/Heroku-style postgres:// URLs need normalization.
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+asyncpg://", 1)

    # Plain postgresql:// URL is converted to asyncpg dialect.
    if raw_url.startswith("postgresql://") and "+asyncpg" not in raw_url:
        return raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    return raw_url


DATABASE_URL = _build_database_url()

# Declarative base shared by repository ORM models.
Base = declarative_base()

# Async SQLAlchemy engine tuned for production API workloads.
engine = create_async_engine(
    DATABASE_URL,
    future=True,
    echo=os.getenv("SQL_ECHO", "false").lower() == "true",
    pool_pre_ping=True,
    pool_recycle=int(os.getenv("DB_POOL_RECYCLE_SECONDS", "1800")),
    pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
)

# Reusable async session factory for repository usage.
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autoflush=False,
    expire_on_commit=False,
)


@asynccontextmanager
async def get_session() -> AsyncIterator[AsyncSession]:
    """
    Async context manager that yields an AsyncSession.

    Commit/rollback is centralized here so callers get safe transactional
    behavior without manually repeating boilerplate.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_session_dependency() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency wrapper around the session context manager.
    """
    async with get_session() as session:
        yield session


async def init_db() -> None:
    """
    Initialize DB connectivity on application startup.

    Schema management is migration-driven (Alembic). Optional automatic
    migration can be enabled with DB_AUTO_MIGRATE=true.
    """
    strict_startup = os.getenv("DB_STRICT_STARTUP", "false").lower() == "true"

    try:
        async with engine.begin() as conn:
            # Multiple uvicorn workers run startup hooks in parallel.
            # Use a Postgres advisory transaction lock to serialize startup probes.
            if conn.dialect.name == "postgresql":
                await conn.execute(text("SELECT pg_advisory_xact_lock(:lock_id)"), {"lock_id": 424242})

            await conn.execute(text("SELECT 1"))

        if os.getenv("DB_AUTO_MIGRATE", "false").lower() == "true":
            from backend.persistence.migrations import run_migrations_to_head

            await run_migrations_to_head()
    except Exception:
        if strict_startup:
            raise
        # Keep service booting in degraded mode; /health reports DB down.
        return


async def close_db() -> None:
    """
    Dispose database engine and close pooled connections.
    """
    await engine.dispose()


async def ping_db() -> bool:
    """
    Lightweight DB connectivity probe for /health.
    """
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
