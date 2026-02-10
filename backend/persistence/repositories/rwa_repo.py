# backend/persistence/repositories/rwa_repo.py

from typing import List, Dict


class RWARepository:
    """
    Repository for Real World Asset records.
    """

    def __init__(self):
        self._storage: Dict[str, dict] = {}

    def create(self, rwa_id: str, data: dict):
        self._storage[rwa_id] = data
        return data

    def get(self, rwa_id: str):
        return self._storage.get(rwa_id)

    def list_all(self) -> List[dict]:
        return list(self._storage.values())
