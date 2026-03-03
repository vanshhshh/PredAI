"""
Service-layer governance workflows (proposal lifecycle + voting).
"""

from __future__ import annotations

import time

from sqlalchemy import select

from backend.persistence.db import AsyncSessionLocal
from backend.persistence.repositories.models import Proposal, ProposalVote
from backend.security.invariants import InvariantViolation


class GovernanceService:
    @staticmethod
    async def create_proposal(
        *,
        proposer: str,
        title: str,
        description: str,
        action_target: str,
        action_data: str,
        execution_delay: int,
    ):
        if not title.strip():
            raise InvariantViolation("INVALID_PROPOSAL_TITLE")
        if not description.strip():
            raise InvariantViolation("INVALID_PROPOSAL_DESCRIPTION")
        if execution_delay < 0:
            raise InvariantViolation("INVALID_EXECUTION_DELAY")

        now = int(time.time())
        voting_window = 7 * 24 * 60 * 60

        async with AsyncSessionLocal() as session:
            async with session.begin():
                proposal = Proposal(
                    proposer=proposer,
                    title=title.strip(),
                    description=description.strip(),
                    action_target=action_target,
                    action_data=action_data,
                    execution_delay=execution_delay,
                    start_block=now,
                    end_block=now + voting_window,
                    for_votes=0,
                    against_votes=0,
                    executed=False,
                    quorum=5_000,
                    execute_after=None,
                )
                session.add(proposal)
                await session.flush()
                return proposal

    @staticmethod
    async def list_proposals(limit: int, offset: int):
        safe_limit = max(1, min(limit, 200))
        safe_offset = max(0, offset)
        async with AsyncSessionLocal() as session:
            result = await session.scalars(
                select(Proposal)
                .order_by(Proposal.proposal_id.desc())
                .limit(safe_limit)
                .offset(safe_offset)
            )
            return list(result)

    @staticmethod
    async def get_proposal(proposal_id: int):
        async with AsyncSessionLocal() as session:
            return await session.scalar(
                select(Proposal).where(Proposal.proposal_id == proposal_id)
            )

    @staticmethod
    async def vote(
        *,
        proposal_id: int,
        voter: str,
        support: bool,
        weight: int,
    ):
        if weight <= 0:
            raise InvariantViolation("INVALID_VOTE_WEIGHT")

        now = int(time.time())
        async with AsyncSessionLocal() as session:
            async with session.begin():
                proposal = await session.scalar(
                    select(Proposal).where(Proposal.proposal_id == proposal_id)
                )
                if not proposal:
                    raise InvariantViolation("PROPOSAL_NOT_FOUND")

                if proposal.executed:
                    raise InvariantViolation("PROPOSAL_ALREADY_EXECUTED")

                if now > int(proposal.end_block):
                    raise InvariantViolation("PROPOSAL_VOTING_ENDED")

                existing = await session.scalar(
                    select(ProposalVote).where(
                        ProposalVote.proposal_id == proposal_id,
                        ProposalVote.voter == voter,
                    )
                )
                if existing:
                    raise InvariantViolation("VOTER_ALREADY_VOTED")

                vote = ProposalVote(
                    proposal_id=proposal_id,
                    voter=voter,
                    support=support,
                    weight=weight,
                )
                session.add(vote)
                if support:
                    proposal.for_votes = int(proposal.for_votes) + weight
                else:
                    proposal.against_votes = int(proposal.against_votes) + weight
                return True

    @staticmethod
    async def queue_proposal(proposal_id: int):
        now = int(time.time())
        async with AsyncSessionLocal() as session:
            async with session.begin():
                proposal = await session.scalar(
                    select(Proposal).where(Proposal.proposal_id == proposal_id)
                )
                if not proposal:
                    raise InvariantViolation("PROPOSAL_NOT_FOUND")
                if proposal.executed:
                    raise InvariantViolation("PROPOSAL_ALREADY_EXECUTED")
                if now < int(proposal.end_block):
                    raise InvariantViolation("PROPOSAL_VOTING_ACTIVE")
                if int(proposal.for_votes) < int(proposal.quorum):
                    raise InvariantViolation("QUORUM_NOT_REACHED")
                if int(proposal.for_votes) <= int(proposal.against_votes):
                    raise InvariantViolation("PROPOSAL_REJECTED")

                proposal.execute_after = now + int(proposal.execution_delay)
                return True
