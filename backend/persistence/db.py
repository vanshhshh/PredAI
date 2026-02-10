"""
PURPOSE
-------
Database bootstrap and session management.

⚠️ DEMO MODE:
- Database is DISABLED
- No network calls
- No engine creation
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession


# -------------------------------------------------------------------
# BASE PLACEHOLDER (for imports)
# -------------------------------------------------------------------

class Base:
    pass


# -------------------------------------------------------------------
# LIFECYCLE HOOKS (NO-OP)
# -------------------------------------------------------------------

async def init_db() -> None:
    print("⚠️ DATABASE DISABLED (DEMO MODE)")
    return


async def close_db() -> None:
    return


# -------------------------------------------------------------------
# SESSION DEPENDENCY (BLOCKED)
# -------------------------------------------------------------------

async def get_session() -> AsyncGenerator[AsyncSession, None]:
    raise RuntimeError("DATABASE DISABLED (DEMO MODE)")
