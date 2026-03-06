# File: backend/persistence/repositories/agent_repo.py
"""
Persistence layer for AI agents.

Repository rules:
- no service logic
- deterministic DB interactions
- idempotent writes for replay workflows
"""

from typing import List, Optional

from sqlalchemy import select, update

from backend.persistence.db import AsyncSessionLocal
from backend.persistence.repositories.models import Agent
from backend.security.invariants import InvariantViolation


class AgentRepository:
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
        async with AsyncSessionLocal() as session:
            async with session.begin():
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
        async with AsyncSessionLocal() as session:
            async with session.begin():
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

    @staticmethod
    async def get_by_agent_id(agent_id: str) -> Optional[Agent]:
        async with AsyncSessionLocal() as session:
            return await session.scalar(
                select(Agent).where(Agent.agent_id == agent_id)
            )

    @staticmethod
    async def list(limit: int, offset: int) -> List[Agent]:
        async with AsyncSessionLocal() as session:
            result = await session.scalars(
                select(Agent)
                .order_by(Agent.score.desc())
                .limit(limit)
                .offset(offset)
            )
            return list(result)

    @staticmethod
    async def list_by_owner(owner: str) -> List[Agent]:
        normalized_owner = owner.strip().lower()
        async with AsyncSessionLocal() as session:
            result = await session.scalars(
                select(Agent)
                .where(Agent.owner == normalized_owner)
                .order_by(Agent.created_at.asc())
            )
            return list(result)

    @staticmethod
    async def activate(*, agent_id: str, stake: Optional[int] = None):
        async with AsyncSessionLocal() as session:
            async with session.begin():
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
        async with AsyncSessionLocal() as session:
            async with session.begin():
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
        async with AsyncSessionLocal() as session:
            async with session.begin():
                result = await session.execute(
                    update(Agent)
                    .where(Agent.agent_id == agent_id)
                    .values(stake=stake)
                )
                if result.rowcount == 0:
                    raise InvariantViolation("AGENT_NOT_FOUND")

    @staticmethod
    async def sync_state(*, agent_id: str, stake: int, active: bool) -> Agent:
        """
        Synchronize off-chain agent state from authoritative on-chain values.
        """
        async with AsyncSessionLocal() as session:
            async with session.begin():
                result = await session.execute(
                    update(Agent)
                    .where(Agent.agent_id == agent_id)
                    .values(stake=int(stake), active=bool(active))
                )
                if result.rowcount == 0:
                    raise InvariantViolation("AGENT_NOT_FOUND")

                return await session.scalar(
                    select(Agent).where(Agent.agent_id == agent_id)
                )

    @staticmethod
    async def unstake(*, agent_id: str, amount: int) -> Agent:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                agent = await session.scalar(
                    select(Agent).where(Agent.agent_id == agent_id)
                )
                if not agent:
                    raise InvariantViolation("AGENT_NOT_FOUND")

                current = int(agent.stake or 0)
                if amount > current:
                    raise InvariantViolation("INSUFFICIENT_STAKE")

                next_stake = current - amount
                agent.stake = next_stake
                if next_stake == 0:
                    agent.active = False

                await session.flush()
                return agent

    @staticmethod
    async def update_score(*, agent_id: str, score: int):
        async with AsyncSessionLocal() as session:
            async with session.begin():
                result = await session.execute(
                    update(Agent)
                    .where(Agent.agent_id == agent_id)
                    .values(score=score)
                )
                if result.rowcount == 0:
                    raise InvariantViolation("AGENT_NOT_FOUND")
