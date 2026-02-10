from sqlalchemy import Column, String, Boolean, Integer, DateTime
from datetime import datetime

from backend.persistence.models.base import Base


class Agent(Base):
    __tablename__ = "agents"

    agent_id = Column(String, primary_key=True, index=True)
    owner = Column(String, nullable=False)
    metadata_uri = Column(String, nullable=False)

    active = Column(Boolean, default=False)
    stake = Column(Integer, default=0)
    score = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
