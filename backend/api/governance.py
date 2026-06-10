# File: backend/api/governance.py
"""
PURPOSE
-------
HTTP API surface for protocol governance.

This module:
- exposes DAO proposal & voting endpoints
- provides governance history & state
- enforces role-based access
- NEVER executes governance actions directly

DESIGN RULES (from docs)
------------------------
- Governance is slow and explicit
- No direct contract mutation here
- All execution goes through Timelock
- Controllers are read/validate only
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional

from backend.services.governance_service import GovernanceService
from backend.security.auth import get_current_user
from backend.security.invariants import InvariantViolation


router = APIRouter()


# -------------------------------------------------------------------
# SCHEMAS
# -------------------------------------------------------------------

class ProposalCreateRequest(BaseModel):
    title: str = Field(..., description="Human-readable title")
    description: str = Field(..., description="Full proposal description")
    action_target: str = Field(..., description="Target contract address")
    action_data: str = Field(..., description="ABI-encoded calldata")
    execution_delay: int = Field(..., description="Timelock delay in seconds")
    tx_hash: str = Field(..., description="On-chain DAO createProposal tx hash")


class ProposalResponse(BaseModel):
    proposal_id: int
    proposer: str
    title: str
    description: str
    start_block: int
    end_block: int
    for_votes: int
    against_votes: int
    executed: bool
    quorum: int
    execute_after: Optional[int]


class VoteRequest(BaseModel):
    support: bool = Field(..., description="True=for, False=against")
    tx_hash: str = Field(..., description="On-chain DAO vote tx hash")


class QueueRequest(BaseModel):
    tx_hash: str = Field(..., description="On-chain DAO queueProposal tx hash")


class ExecuteRequest(BaseModel):
    tx_hash: str = Field(..., description="On-chain DAO executeProposal tx hash")


# -------------------------------------------------------------------
# ENDPOINTS
# -------------------------------------------------------------------

@router.post(
    "/proposals",
    response_model=ProposalResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_proposal(
    req: ProposalCreateRequest,
    user=Depends(get_current_user),
):
    """
    Submit a new governance proposal.

    NOTE:
    -----
    - Requires an on-chain DAO proposal transaction
    - Execution remains timelocked
    """
    try:
        return await GovernanceService.create_proposal(
            proposer=user.address,
            title=req.title,
            description=req.description,
            action_target=req.action_target,
            action_data=req.action_data,
            execution_delay=req.execution_delay,
            tx_hash=req.tx_hash,
        )
    except InvariantViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.get(
    "/proposals",
    response_model=List[ProposalResponse],
)
async def list_proposals(
    limit: int = 50,
    offset: int = 0,
):
    """
    Paginated list of governance proposals.
    """
    return await GovernanceService.list_proposals(limit, offset)


@router.get(
    "/proposals/{proposal_id}",
    response_model=ProposalResponse,
)
async def get_proposal(proposal_id: int):
    """
    Fetch a single proposal by ID.
    """
    proposal = await GovernanceService.get_proposal(proposal_id)
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )
    return proposal


@router.post(
    "/proposals/{proposal_id}/vote",
    status_code=status.HTTP_200_OK,
)
async def vote(
    proposal_id: int,
    req: VoteRequest,
    user=Depends(get_current_user),
):
    """
    Cast a vote on a proposal.
    """
    try:
        await GovernanceService.vote(
            proposal_id=proposal_id,
            voter=user.address,
            support=req.support,
            tx_hash=req.tx_hash,
        )
        return {"status": "voted"}
    except InvariantViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.post(
    "/proposals/{proposal_id}/queue",
    status_code=status.HTTP_200_OK,
)
async def queue_proposal(
    proposal_id: int,
    req: QueueRequest,
    user=Depends(get_current_user),
):
    """
    Queue a proposal into the timelock after voting ends.
    """
    try:
        await GovernanceService.queue_proposal(
            proposal_id=proposal_id,
            caller=user.address,
            tx_hash=req.tx_hash,
        )
        return {"status": "queued"}
    except InvariantViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.post(
    "/proposals/{proposal_id}/execute",
    status_code=status.HTTP_200_OK,
)
async def execute_proposal(
    proposal_id: int,
    req: ExecuteRequest,
    user=Depends(get_current_user),
):
    try:
        await GovernanceService.execute_proposal(
            proposal_id=proposal_id,
            caller=user.address,
            tx_hash=req.tx_hash,
        )
        return {"status": "executed"}
    except InvariantViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )
