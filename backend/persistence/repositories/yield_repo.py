# backend/persistence/repositories/yield_repo.py

from typing import Dict, List
from backend.persistence.repositories.models import YieldPosition


class YieldRepository:
    """
    Persistence layer for yield positions.
    """

    def __init__(self):
        self._positions: Dict[str, YieldPosition] = {}

    def create_position(self, position: YieldPosition):
        self._positions[position.id] = position
        return position

    def get_by_user(self, user_id: str) -> List[YieldPosition]:
        return [
            p for p in self._positions.values()
            if p.user_id == user_id
        ]

    def get_by_market(self, market_id: str) -> List[YieldPosition]:
        return [
            p for p in self._positions.values()
            if p.market_id == market_id
        ]
