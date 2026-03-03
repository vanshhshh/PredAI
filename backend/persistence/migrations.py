"""
Alembic migration runner helpers.
"""

from __future__ import annotations

import asyncio
from pathlib import Path

from alembic import command
from alembic.config import Config


def _alembic_config() -> Config:
    backend_dir = Path(__file__).resolve().parents[1]
    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    return config


async def run_migrations_to_head() -> None:
    cfg = _alembic_config()
    await asyncio.to_thread(command.upgrade, cfg, "head")
