"""username unique index

Revision ID: 20260303_000002
Revises: 20260302_000001
Create Date: 2026-03-03 00:00:02
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "20260303_000002"
down_revision: Union[str, None] = "20260302_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Case-insensitive uniqueness while still allowing NULL usernames.
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username_ci
        ON users (LOWER(username))
        WHERE username IS NOT NULL;
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_users_username_ci;")

