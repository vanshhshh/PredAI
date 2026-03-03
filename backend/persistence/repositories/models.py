"""
SQLAlchemy ORM models for backend repositories.

These models intentionally reflect the fields used by the service/repository
layer so API routes map directly to persisted state.
"""

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)

from backend.persistence.db import Base


class User(Base):
    __tablename__ = "users"

    address = Column(String, primary_key=True)
    username = Column(String, nullable=True)
    reputation_score = Column(Integer, nullable=False, default=0)
    is_governance = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Agent(Base):
    __tablename__ = "agents"

    agent_id = Column(String, primary_key=True)
    owner = Column(String, nullable=False, index=True)
    metadata_uri = Column(String, nullable=False)
    active = Column(Boolean, nullable=False, default=False)
    stake = Column(BigInteger, nullable=False, default=0)
    score = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Market(Base):
    __tablename__ = "markets"

    market_id = Column(String, primary_key=True)
    address = Column(String, nullable=False, unique=True, index=True)
    creator = Column(String, nullable=False, index=True)
    start_time = Column(BigInteger, nullable=False)
    end_time = Column(BigInteger, nullable=False)
    max_exposure = Column(BigInteger, nullable=False)
    metadata_uri = Column(Text, nullable=False)
    settled = Column(Boolean, nullable=False, default=False)
    final_outcome = Column(Boolean, nullable=True)
    outcome_wrapped = Column(Boolean, nullable=False, default=False)
    yes_token = Column(String, nullable=True)
    no_token = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class MarketBet(Base):
    __tablename__ = "market_bets"
    __table_args__ = (
        UniqueConstraint("user_address", "market_id", "side", name="uq_market_bet_user_market_side"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_address = Column(String, ForeignKey("users.address"), nullable=False, index=True)
    market_id = Column(String, ForeignKey("markets.market_id"), nullable=False, index=True)
    side = Column(String, nullable=False)
    amount = Column(BigInteger, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class Oracle(Base):
    __tablename__ = "oracles"

    oracle_id = Column(String, primary_key=True)
    address = Column(String, nullable=False, unique=True, index=True)
    metadata_uri = Column(String, nullable=False)
    active = Column(Boolean, nullable=False, default=False)
    stake = Column(BigInteger, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class OracleSubmission(Base):
    __tablename__ = "oracle_submissions"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    oracle_address = Column(String, ForeignKey("oracles.address"), nullable=False, index=True)
    market_id = Column(String, ForeignKey("markets.market_id"), nullable=False, index=True)
    outcome = Column(Boolean, nullable=False)
    confidence_bps = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Proposal(Base):
    __tablename__ = "proposals"

    proposal_id = Column(Integer, primary_key=True, autoincrement=True)
    proposer = Column(String, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    action_target = Column(String, nullable=False)
    action_data = Column(Text, nullable=False)
    execution_delay = Column(Integer, nullable=False)
    start_block = Column(BigInteger, nullable=False)
    end_block = Column(BigInteger, nullable=False)
    for_votes = Column(BigInteger, nullable=False, default=0)
    against_votes = Column(BigInteger, nullable=False, default=0)
    executed = Column(Boolean, nullable=False, default=False)
    quorum = Column(BigInteger, nullable=False, default=0)
    execute_after = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class ProposalVote(Base):
    __tablename__ = "proposal_votes"
    __table_args__ = (
        UniqueConstraint("proposal_id", "voter", name="uq_proposal_voter"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    proposal_id = Column(Integer, ForeignKey("proposals.proposal_id"), nullable=False, index=True)
    voter = Column(String, nullable=False, index=True)
    support = Column(Boolean, nullable=False)
    weight = Column(BigInteger, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class YieldVault(Base):
    __tablename__ = "yield_vaults"

    vault_id = Column(String, primary_key=True)
    strategy = Column(String, nullable=False)
    total_deposited = Column(BigInteger, nullable=False, default=0)
    apy_bps = Column(Integer, nullable=False, default=0)
    risk_score = Column(Integer, nullable=False, default=0)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class YieldPosition(Base):
    __tablename__ = "yield_positions"
    __table_args__ = (
        UniqueConstraint("user_address", "vault_id", name="uq_yield_user_vault"),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_address = Column(String, ForeignKey("users.address"), nullable=False, index=True)
    vault_id = Column(String, ForeignKey("yield_vaults.vault_id"), nullable=False, index=True)
    amount = Column(BigInteger, nullable=False, default=0)
    apy_bps = Column(Integer, nullable=False, default=0)
    risk_score = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class SocialEvent(Base):
    __tablename__ = "social_events"
    __table_args__ = (
        UniqueConstraint("source", "external_id", name="uq_social_source_external_id"),
    )

    event_id = Column(String, primary_key=True)
    source = Column(String, nullable=False, index=True)
    external_id = Column(String, nullable=False)
    author = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    timestamp = Column(BigInteger, nullable=False)
    metadata_json = Column("metadata", JSON, nullable=False, default=dict)
    signal_score_bps = Column(Integer, nullable=False, default=0)
    market_eligible = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class StagedMarket(Base):
    __tablename__ = "staged_markets"

    staged_market_id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    event_id = Column(String, ForeignKey("social_events.event_id"), nullable=False, index=True)
    prompt = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class RWAAsset(Base):
    __tablename__ = "rwa_assets"

    rwa_id = Column(String, primary_key=True)
    token_address = Column(String, nullable=False)
    metadata_uri = Column(Text, nullable=False)
    max_supply = Column(BigInteger, nullable=False)
    current_supply = Column(BigInteger, nullable=False, default=0)
    creator = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
