# File: backend/api/agents.py
"""
PURPOSE
-------
HTTP API surface for AI agents participating in the protocol.

This module:
- exposes agent registration & lifecycle endpoints
- allows users to stake, activate, and deactivate agents
- surfaces agent performance & metadata
- NEVER performs scoring, staking, or blockchain logic directly

DESIGN RULES (from docs)
------------------------
- Controllers are thin
- No direct blockchain calls
- No direct database access
- All economic logic delegated to services layer
- Explicit authorization via wallet identity
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List

from backend.services.autonomous_agent_service import AutonomousAgentService
from backend.services.agent_service import AgentService
from backend.security.auth import get_current_user
from backend.security.invariants import InvariantViolation


router = APIRouter()


# -------------------------------------------------------------------
# SCHEMAS
# -------------------------------------------------------------------

class AgentRegisterRequest(BaseModel):
    agent_id: str = Field(..., description="Deterministic agent identifier")
    metadata_uri: str = Field(..., description="IPFS / Arweave metadata URI")
    tx_hash: str = Field(..., description="User on-chain register tx hash")


class AgentResponse(BaseModel):
    agent_id: str
    owner: str
    active: bool
    stake: int
    score: int
    metadata_uri: str


class AgentStakeRequest(BaseModel):
    amount: int = Field(..., description="Stake amount in wei")
    tx_hash: str = Field(..., description="User on-chain tx hash")


class AgentRunRequest(BaseModel):
    execute_live: bool = Field(False, description="Submit live on-chain trades if enabled")
    market_limit: int = Field(25, ge=1, le=100)


class AgentPredictionResponse(BaseModel):
    prediction_id: str
    agent_id: str
    market_id: str
    owner: str
    side: str
    model_probability_bps: int
    market_probability_bps: int
    confidence_bps: int
    edge_bps: int
    stake_amount: int
    status: str
    reason: str
    tx_hash: Optional[str]
    metrics: dict
    settled_outcome: Optional[bool]
    created_at: str


class AgentPerformanceResponse(BaseModel):
    total_predictions: int
    scored_predictions: int
    executed_predictions: int
    paper_predictions: int
    hit_rate: float
    brier_score: float
    log_loss: float
    estimated_pnl_wei: int
    max_drawdown_wei: int


# -------------------------------------------------------------------
# ENDPOINTS
# -------------------------------------------------------------------

@router.post(
    "/register",
    response_model=AgentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_agent(
    req: AgentRegisterRequest,
    user=Depends(get_current_user),
):
    """
    Register a new AI agent.

    NOTE:
    -----
    - One agent ID per owner
    - Registration does NOT activate the agent
    """
    try:
        return await AgentService.register_agent(
            owner_address=user.address,
            agent_id=req.agent_id,
            metadata_uri=req.metadata_uri,
            tx_hash=req.tx_hash,
        )
    except InvariantViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.post(
    "/{agent_id}/stake",
    response_model=AgentResponse,
)
async def stake_and_activate_agent(
    agent_id: str,
    req: AgentStakeRequest,
    user=Depends(get_current_user),
):
    """
    Stake capital and activate an agent.

    NOTE:
    -----
    - Requires prior registration
    - Stake amount must satisfy protocol minimum
    """
    try:
        return await AgentService.stake_and_activate(
            owner_address=user.address,
            agent_id=agent_id,
            amount=req.amount,
            tx_hash=req.tx_hash,
        )
    except InvariantViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.post(
    "/{agent_id}/deactivate",
    response_model=AgentResponse,
)
async def deactivate_agent(
    agent_id: str,
    tx_hash: str,
    user=Depends(get_current_user),
):
    """
    Deactivate an agent.

    NOTE:
    -----
    - Does not immediately unstake funds
    - Agent stops participating in markets
    """
    try:
        return await AgentService.deactivate_agent(
            owner_address=user.address,
            agent_id=agent_id,
            tx_hash=tx_hash,
        )
    except InvariantViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.post(
    "/{agent_id}/unstake",
    response_model=AgentResponse,
)
async def unstake_agent(
    agent_id: str,
    req: AgentStakeRequest,
    user=Depends(get_current_user),
):
    """
    Unstake capital from an agent.
    """
    try:
        return await AgentService.unstake_agent(
            owner_address=user.address,
            agent_id=agent_id,
            amount=req.amount,
            tx_hash=req.tx_hash,
        )
    except InvariantViolation as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.message,
        )


@router.post("/{agent_id}/run")
async def run_agent(
    agent_id: str,
    req: AgentRunRequest,
    user=Depends(get_current_user),
):
    """
    Run one autonomous decision cycle for an owned active agent.
    """
    agent = await AgentService.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    if agent.owner.lower() != user.address.lower():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not agent owner")

    try:
        return await AutonomousAgentService.run_agent_cycle(
            agent_id=agent_id,
            execute_live=req.execute_live,
            market_limit=req.market_limit,
        )
    except InvariantViolation as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)


@router.get("/{agent_id}/predictions", response_model=List[AgentPredictionResponse])
async def list_agent_predictions(agent_id: str, limit: int = 100, offset: int = 0):
    agent = await AgentService.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return await AutonomousAgentService.list_predictions(
        agent_id=agent_id,
        limit=max(1, min(200, limit)),
        offset=max(0, offset),
    )


@router.get("/{agent_id}/performance", response_model=AgentPerformanceResponse)
async def get_agent_performance(agent_id: str):
    try:
        return await AutonomousAgentService.performance(agent_id)
    except InvariantViolation as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=e.message)


@router.get(
    "/{agent_id}",
    response_model=AgentResponse,
)
async def get_agent(agent_id: str):
    """
    Fetch a single agent by agent_id.
    """
    agent = await AgentService.get_agent(agent_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found",
        )
    return agent


@router.get(
    "/",
    response_model=List[AgentResponse],
)
async def list_agents(
    limit: int = 50,
    offset: int = 0,
):
    """
    Paginated list of registered agents.
    """
    return await AgentService.list_agents(limit=limit, offset=offset)
