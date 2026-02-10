# File: backend/persistence/repositories/agent_repo.py
"""
PURPOSE
-------
Persistence layer for AI agents.

This module:
- encapsulates ALL database access for agents
- provides idempotent CRUD operations
- supports indexer replay and live updates
- NEVER contains business logic

DESIGN RULES (from docs)
------------------------
- No service logic here
- No blockchain calls
- Idempotent writes
- Deterministic queries
"""

from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.persistence.db import get_session
from backend.security.invariants import InvariantViolation
from backend.persistence.repositories.models import Agent
  # ORM model


class AgentRepository:
    # ------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------

    @staticmethod
    async def create(
        *,
        agent_id: str,
        owner: str,
        metadata_uri: str,
        active: bool,
        stake: int,
        score: int,
    ):
        async for session in get_session():
            agent = Agent(
                agent_id=agent_id,
                owner=owner,
                metadata_uri=metadata_uri,
                active=active,
                stake=stake,
                score=score,
            )
            session.add(agent)
            await session.flush()
            return agent

    @staticmethod
    async def create_from_event(
        *,
        agent_id: str,
        owner: str,
        metadata_uri: str,
    ):
        """
        Idempotent creation used by indexer replay.
        """
        async for session in get_session():
            exists = await session.scalar(
                select(Agent).where(Agent.agent_id == agent_id)
            )
            if exists:
                return exists

            agent = Agent(
                agent_id=agent_id,
                owner=owner,
                metadata_uri=metadata_uri,
                active=False,
                stake=0,
                score=0,
            )
            session.add(agent)
            await session.flush()
            return agent

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    @staticmethod
    async def get_by_agent_id(agent_id: str) -> Optional[Agent]:
        async for session in get_session():
            return await session.scalar(
                select(Agent).where(Agent.agent_id == agent_id)
            )

    @staticmethod
    async def list(limit: int, offset: int) -> List[Agent]:
        async for session in get_session():
            result = await session.scalars(
                select(Agent)
                .order_by(Agent.score.desc())
                .limit(limit)
                .offset(offset)
            )
            return list(result)

    # ------------------------------------------------------------------
    # UPDATE
    # ------------------------------------------------------------------

    @staticmethod
    async def activate(*, agent_id: str, stake: Optional[int] = None):
        async for session in get_session():
            values = {"active": True}
            if stake is not None:
                values["stake"] = stake

            result = await session.execute(
                update(Agent)
                .where(Agent.agent_id == agent_id)
                .values(**values)
            )
            if result.rowcount == 0:
                raise InvariantViolation("AGENT_NOT_FOUND")

            return await session.scalar(
                select(Agent).where(Agent.agent_id == agent_id)
            )

    @staticmethod
    async def deactivate(*, agent_id: str):
        async for session in get_session():
            result = await session.execute(
                update(Agent)
                .where(Agent.agent_id == agent_id)
                .values(active=False)
            )
            if result.rowcount == 0:
                raise InvariantViolation("AGENT_NOT_FOUND")

            return await session.scalar(
                select(Agent).where(Agent.agent_id == agent_id)
            )

    @staticmethod
    async def update_stake(*, agent_id: str, stake: int):
        async for session in get_session():
            result = await session.execute(
                update(Agent)
                .where(Agent.agent_id == agent_id)
                .values(stake=stake)
            )
            if result.rowcount == 0:
                raise InvariantViolation("AGENT_NOT_FOUND")

    @staticmethod
    async def update_score(*, agent_id: str, score: int):
        async for session in get_session():
            result = await session.execute(
                update(Agent)
                .where(Agent.agent_id == agent_id)
                .values(score=score)
            )
            if result.rowcount == 0:
                raise InvariantViolation("AGENT_NOT_FOUND")
