"""baseline schema

Revision ID: 20260302_000001
Revises:
Create Date: 2026-03-02 00:00:01
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op

from backend.persistence.db import Base

# Register ORM models on metadata.
import backend.persistence.repositories.models  # noqa: F401


revision: str = "20260302_000001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
