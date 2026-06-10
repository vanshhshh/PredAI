"""rename paper model calibration table

Revision ID: 20260609_000005
Revises: 20260528_000004
Create Date: 2026-06-09 00:00:05
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op


revision: str = "20260609_000005"
down_revision: Union[str, None] = "20260528_000004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.rename_table("paper_model_calibrations", "paper_model_calibration")
    op.execute(
        "ALTER INDEX IF EXISTS ix_paper_model_calibrations_agent_id "
        "RENAME TO ix_paper_model_calibration_agent_id"
    )
    op.execute(
        "ALTER INDEX IF EXISTS ix_paper_model_calibrations_source "
        "RENAME TO ix_paper_model_calibration_source"
    )
    op.execute(
        "ALTER INDEX IF EXISTS ix_paper_model_calibrations_category "
        "RENAME TO ix_paper_model_calibration_category"
    )


def downgrade() -> None:
    op.rename_table("paper_model_calibration", "paper_model_calibrations")
    op.execute(
        "ALTER INDEX IF EXISTS ix_paper_model_calibration_agent_id "
        "RENAME TO ix_paper_model_calibrations_agent_id"
    )
    op.execute(
        "ALTER INDEX IF EXISTS ix_paper_model_calibration_source "
        "RENAME TO ix_paper_model_calibrations_source"
    )
    op.execute(
        "ALTER INDEX IF EXISTS ix_paper_model_calibration_category "
        "RENAME TO ix_paper_model_calibrations_category"
    )
