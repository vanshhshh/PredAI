# backend/services/governance_service.py

from typing import Dict
from backend.persistence.repositories.market_repo import MarketRepository


class GovernanceService:
    """
    Governance rules, pauses, limits, and protocol-level controls.
    """

    def __init__(self, market_repo: MarketRepository | None = None):
        self.market_repo = market_repo or MarketRepository()

    def emergency_pause_market(self, market_id: str, reason: str):
        return self.market_repo.set_market_status(
            market_id=market_id,
            status="paused",
            metadata={"reason": reason}
        )

    def resume_market(self, market_id: str):
        return self.market_repo.set_market_status(
            market_id=market_id,
            status="active"
        )

    def get_governance_state(self) -> Dict:
        return self.market_repo.get_global_state()
