# backend/persistence/repositories/social_repo.py

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional
import uuid


@dataclass
class SocialAction:
    """
    Represents a social interaction in the system.
    Examples:
    - follow
    - like
    - comment
    - share
    """
    id: str
    actor_id: str
    target_id: str
    action_type: str
    metadata: Optional[dict]
    created_at: datetime


class SocialRepository:
    """
    Persistence layer for social interactions.
    Designed to be DB-agnostic.
    """

    def __init__(self):
        # in-memory storage (replace with DB later)
        self._actions: Dict[str, SocialAction] = {}

    # ---------- CREATE ----------

    def create_action(
        self,
        actor_id: str,
        target_id: str,
        action_type: str,
        metadata: Optional[dict] = None
    ) -> SocialAction:
        action = SocialAction(
            id=str(uuid.uuid4()),
            actor_id=actor_id,
            target_id=target_id,
            action_type=action_type,
            metadata=metadata or {},
            created_at=datetime.utcnow()
        )
        self._actions[action.id] = action
        return action

    # ---------- READ ----------

    def get_action(self, action_id: str) -> Optional[SocialAction]:
        return self._actions.get(action_id)

    def get_actions_by_actor(self, actor_id: str) -> List[SocialAction]:
        return [
            a for a in self._actions.values()
            if a.actor_id == actor_id
        ]

    def get_actions_on_target(self, target_id: str) -> List[SocialAction]:
        return [
            a for a in self._actions.values()
            if a.target_id == target_id
        ]

    def get_actions_by_type(self, action_type: str) -> List[SocialAction]:
        return [
            a for a in self._actions.values()
            if a.action_type == action_type
        ]

    # ---------- DELETE ----------

    def delete_action(self, action_id: str) -> bool:
        if action_id in self._actions:
            del self._actions[action_id]
            return True
        return False
