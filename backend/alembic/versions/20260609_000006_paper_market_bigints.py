"""widen paper market volume columns

Revision ID: 20260609_000006
Revises: 20260609_000005
Create Date: 2026-06-09 00:00:06
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260609_000006"
down_revision: Union[str, None] = "20260609_000005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("paper_markets", "liquidity", type_=sa.BigInteger(), existing_nullable=False)
    op.alter_column("paper_markets", "volume_24h", type_=sa.BigInteger(), existing_nullable=False)
    op.alter_column("paper_markets", "volume_total", type_=sa.BigInteger(), existing_nullable=False)


def downgrade() -> None:
    op.alter_column("paper_markets", "volume_total", type_=sa.Integer(), existing_nullable=False)
    op.alter_column("paper_markets", "volume_24h", type_=sa.Integer(), existing_nullable=False)
    op.alter_column("paper_markets", "liquidity", type_=sa.Integer(), existing_nullable=False)
