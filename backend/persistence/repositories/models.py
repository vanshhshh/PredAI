# File: backend/persistence/repositories/models.py
"""
PURPOSE
-------
SQLAlchemy ORM models.

These models:
- define database schema
- are used ONLY by repositories
- are registered during app startup

DO NOT:
- put business logic here
- put API logic here
"""

# File: backend/persistence/repositories/models.py

from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Float,
    DateTime,
    JSON,
    ForeignKey,
)
from sqlalchemy.orm import relationship

from backend.persistence.db import Base


# -------------------------------------------------------------------
# USER
# -------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    wallet_address = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# -------------------------------------------------------------------
# AGENT
# -------------------------------------------------------------------

class Agent(Base):
    __tablename__ = "agents"

    agent_id = Column(String, primary_key=True)
    owner = Column(String, nullable=False)
    metadata_uri = Column(String, nullable=False)
    active = Column(Boolean, default=False)
    stake = Column(Integer, default=0)
    score = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


# -------------------------------------------------------------------
# MARKET
# -------------------------------------------------------------------

class Market(Base):
    __tablename__ = "markets"

    id = Column(String, primary_key=True)
    status = Column(String, nullable=False)

    # 🚨 metadata is RESERVED — must not use it
    market_meta = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


# -------------------------------------------------------------------
# ORACLE
# -------------------------------------------------------------------

class Oracle(Base):
    __tablename__ = "oracles"

    oracle_id = Column(String, primary_key=True)
    stake = Column(Integer, default=0)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# -------------------------------------------------------------------
# ORACLE SUBMISSION
# -------------------------------------------------------------------

class OracleSubmission(Base):
    __tablename__ = "oracle_submissions"

    id = Column(String, primary_key=True)
    oracle_id = Column(String, ForeignKey("oracles.oracle_id"), nullable=False)
    market_id = Column(String, ForeignKey("markets.id"), nullable=False)

    outcome = Column(Boolean, nullable=False)
    confidence_bps = Column(Integer, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    oracle = relationship("Oracle")
    market = relationship("Market")


# -------------------------------------------------------------------
# YIELD POSITION
# -------------------------------------------------------------------

class YieldPosition(Base):
    __tablename__ = "yield_positions"

    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    market_id = Column(String, ForeignKey("markets.id"), nullable=False)

    amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
