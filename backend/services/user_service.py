# backend/services/user_service.py

from typing import Optional
from backend.persistence.repositories.user_repo import UserRepository


class UserService:
    """
    Handles user-related business logic.
    """

    def __init__(self, user_repo: Optional[UserRepository] = None):
        self.user_repo = user_repo or UserRepository()

    def get_user_by_id(self, user_id: str):
        return self.user_repo.get_by_id(user_id)

    def get_user_by_wallet(self, wallet_address: str):
        return self.user_repo.get_by_wallet(wallet_address)

    def create_user(self, user_data: dict):
        return self.user_repo.create(user_data)

    def deactivate_user(self, user_id: str):
        return self.user_repo.deactivate(user_id)
