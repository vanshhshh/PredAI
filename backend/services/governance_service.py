"""
Service-layer governance workflows (proposal lifecycle + voting).
"""

from __future__ import annotations

from sqlalchemy import select

from backend.indexing.block_listener import ChainReader
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
        tx_hash: str,
    ):
        if not title.strip():
            raise InvariantViolation("INVALID_PROPOSAL_TITLE")
        if not description.strip():
            raise InvariantViolation("INVALID_PROPOSAL_DESCRIPTION")
        if execution_delay < 0:
            raise InvariantViolation("INVALID_EXECUTION_DELAY")
        if not action_target or not action_target.startswith("0x") or len(action_target) != 42:
            raise InvariantViolation("INVALID_ACTION_TARGET")
        if not action_data or not action_data.startswith("0x"):
            raise InvariantViolation("INVALID_ACTION_DATA")
        if not tx_hash:
            raise InvariantViolation("GOVERNANCE_CREATE_TX_REQUIRED")

        receipt = await ChainReader.verify_governance_create_tx(
            tx_hash=tx_hash,
            proposer=proposer,
            target=action_target,
            action_data=action_data,
            description=description.strip(),
        )
        proposal_id = None
        for log in receipt.get("logs", []):
            if log.get("event") == "ProposalCreated":
                proposal_id = int(log.get("proposalId") or log.get("proposal_id"))
                break
        if proposal_id is None:
            raise InvariantViolation("GOVERNANCE_PROPOSAL_EVENT_MISSING")

        chain_proposal = await ChainReader.get_governance_proposal(
            proposal_id=proposal_id,
        )

        async with AsyncSessionLocal() as session:
            async with session.begin():
                existing = await session.scalar(
                    select(Proposal).where(Proposal.proposal_id == proposal_id)
                )
                if existing:
                    return existing

                proposal = Proposal(
                    proposal_id=proposal_id,
                    proposer=proposer,
                    title=title.strip(),
                    description=chain_proposal["description"],
                    action_target=chain_proposal["target"],
                    action_data=chain_proposal["data"],
                    execution_delay=execution_delay,
                    start_block=chain_proposal["start_block"],
                    end_block=chain_proposal["end_block"],
                    for_votes=chain_proposal["for_votes"],
                    against_votes=chain_proposal["against_votes"],
                    executed=chain_proposal["executed"],
                    quorum=chain_proposal["quorum"],
                    execute_after=chain_proposal["execute_after"],
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
        tx_hash: str,
    ):
        if not tx_hash:
            raise InvariantViolation("GOVERNANCE_VOTE_TX_REQUIRED")

        receipt = await ChainReader.verify_governance_vote_tx(
            tx_hash=tx_hash,
            voter=voter,
            proposal_id=proposal_id,
            support=support,
        )
        weight = None
        for log in receipt.get("logs", []):
            if log.get("event") == "VoteCast" and int(log.get("proposalId") or log.get("proposal_id")) == proposal_id:
                weight = int(log.get("weight"))
                break
        if weight is None or weight <= 0:
            raise InvariantViolation("GOVERNANCE_VOTE_EVENT_MISSING")

        async with AsyncSessionLocal() as session:
            async with session.begin():
                proposal = await session.scalar(
                    select(Proposal).where(Proposal.proposal_id == proposal_id)
                )
                if not proposal:
                    raise InvariantViolation("PROPOSAL_NOT_FOUND")

                if proposal.executed:
                    raise InvariantViolation("PROPOSAL_ALREADY_EXECUTED")

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

                chain_proposal = await ChainReader.get_governance_proposal(
                    proposal_id=proposal_id,
                )
                proposal.for_votes = chain_proposal["for_votes"]
                proposal.against_votes = chain_proposal["against_votes"]
                return True

    @staticmethod
    async def queue_proposal(*, proposal_id: int, caller: str, tx_hash: str):
        if not tx_hash:
            raise InvariantViolation("GOVERNANCE_QUEUE_TX_REQUIRED")

        async with AsyncSessionLocal() as session:
            async with session.begin():
                proposal = await session.scalar(
                    select(Proposal).where(Proposal.proposal_id == proposal_id)
                )
                if not proposal:
                    raise InvariantViolation("PROPOSAL_NOT_FOUND")
                if proposal.executed:
                    raise InvariantViolation("PROPOSAL_ALREADY_EXECUTED")

                receipt = await ChainReader.verify_governance_queue_tx(
                    tx_hash=tx_hash,
                    caller=caller,
                    proposal_id=proposal_id,
                    delay=int(proposal.execution_delay),
                )
                execute_after = None
                for log in receipt.get("logs", []):
                    if log.get("event") == "ProposalQueued" and int(log.get("proposalId") or log.get("proposal_id")) == proposal_id:
                        execute_after = int(log.get("executeAfter") or log.get("execute_after"))
                        break
                if execute_after is None:
                    raise InvariantViolation("GOVERNANCE_QUEUE_EVENT_MISSING")

                chain_proposal = await ChainReader.get_governance_proposal(
                    proposal_id=proposal_id,
                )
                proposal.for_votes = chain_proposal["for_votes"]
                proposal.against_votes = chain_proposal["against_votes"]
                proposal.execute_after = execute_after
                return True

    @staticmethod
    async def execute_proposal(*, proposal_id: int, caller: str, tx_hash: str):
        if not tx_hash:
            raise InvariantViolation("GOVERNANCE_EXECUTE_TX_REQUIRED")

        receipt = await ChainReader.verify_governance_execute_tx(
            tx_hash=tx_hash,
            caller=caller,
            proposal_id=proposal_id,
        )
        executed = any(
            log.get("event") == "ProposalExecuted"
            and int(log.get("proposalId") or log.get("proposal_id")) == proposal_id
            for log in receipt.get("logs", [])
        )
        if not executed:
            raise InvariantViolation("GOVERNANCE_EXECUTE_EVENT_MISSING")

        async with AsyncSessionLocal() as session:
            async with session.begin():
                proposal = await session.scalar(
                    select(Proposal).where(Proposal.proposal_id == proposal_id)
                )
                if not proposal:
                    raise InvariantViolation("PROPOSAL_NOT_FOUND")

                chain_proposal = await ChainReader.get_governance_proposal(
                    proposal_id=proposal_id,
                )
                proposal.executed = chain_proposal["executed"]
                proposal.execute_after = chain_proposal["execute_after"]
                return True
