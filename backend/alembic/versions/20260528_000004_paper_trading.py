"""paper trading markets and predictions

Revision ID: 20260528_000004
Revises: 20260527_000003
Create Date: 2026-05-28 00:00:04
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260528_000004"
down_revision: Union[str, None] = "20260527_000003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "paper_markets",
        sa.Column("paper_market_id", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("external_id", sa.String(), nullable=False),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("category", sa.String(), nullable=False, server_default="general"),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("end_time", sa.DateTime(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("closed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("final_outcome", sa.Boolean(), nullable=True),
        sa.Column("yes_price_bps", sa.Integer(), nullable=False, server_default="5000"),
        sa.Column("no_price_bps", sa.Integer(), nullable=False, server_default="5000"),
        sa.Column("liquidity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("volume_24h", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("volume_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("clob_token_ids", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
        sa.Column("raw_payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("paper_market_id"),
        sa.UniqueConstraint("source", "external_id", name="uq_paper_market_source_external"),
    )
    op.create_index("ix_paper_markets_source", "paper_markets", ["source"])
    op.create_index("ix_paper_markets_external_id", "paper_markets", ["external_id"])
    op.create_index("ix_paper_markets_slug", "paper_markets", ["slug"])
    op.create_index("ix_paper_markets_category", "paper_markets", ["category"])
    op.create_index("ix_paper_markets_end_time", "paper_markets", ["end_time"])

    op.create_table(
        "paper_predictions",
        sa.Column("prediction_id", sa.String(), nullable=False),
        sa.Column("run_id", sa.String(), nullable=False),
        sa.Column("agent_id", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("external_market_id", sa.String(), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("category", sa.String(), nullable=False, server_default="general"),
        sa.Column("side", sa.String(), nullable=False),
        sa.Column("model_probability_bps", sa.Integer(), nullable=False),
        sa.Column("calibrated_probability_bps", sa.Integer(), nullable=False),
        sa.Column("market_probability_bps", sa.Integer(), nullable=False),
        sa.Column("confidence_bps", sa.Integer(), nullable=False),
        sa.Column("edge_bps", sa.Integer(), nullable=False),
        sa.Column("stake_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("entry_price_bps", sa.Integer(), nullable=False),
        sa.Column("current_price_bps", sa.Integer(), nullable=False),
        sa.Column("exit_price_bps", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="OPEN"),
        sa.Column("reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("features", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("metrics", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("final_outcome", sa.Boolean(), nullable=True),
        sa.Column("pnl_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("opened_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("settled_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("prediction_id"),
        sa.UniqueConstraint("agent_id", "source", "external_market_id", name="uq_paper_prediction_agent_market"),
    )
    op.create_index("ix_paper_predictions_run_id", "paper_predictions", ["run_id"])
    op.create_index("ix_paper_predictions_agent_id", "paper_predictions", ["agent_id"])
    op.create_index("ix_paper_predictions_source", "paper_predictions", ["source"])
    op.create_index("ix_paper_predictions_external_market_id", "paper_predictions", ["external_market_id"])
    op.create_index("ix_paper_predictions_category", "paper_predictions", ["category"])

    op.create_table(
        "paper_model_calibrations",
        sa.Column("calibration_id", sa.String(), nullable=False),
        sa.Column("agent_id", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False, server_default="general"),
        sa.Column("sample_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bias_bps", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("brier_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("log_loss_bps", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("calibration_id"),
        sa.UniqueConstraint("agent_id", "source", "category", name="uq_paper_calibration_agent_source_category"),
    )
    op.create_index("ix_paper_model_calibrations_agent_id", "paper_model_calibrations", ["agent_id"])
    op.create_index("ix_paper_model_calibrations_source", "paper_model_calibrations", ["source"])
    op.create_index("ix_paper_model_calibrations_category", "paper_model_calibrations", ["category"])


def downgrade() -> None:
    op.drop_index("ix_paper_model_calibrations_category", table_name="paper_model_calibrations")
    op.drop_index("ix_paper_model_calibrations_source", table_name="paper_model_calibrations")
    op.drop_index("ix_paper_model_calibrations_agent_id", table_name="paper_model_calibrations")
    op.drop_table("paper_model_calibrations")

    op.drop_index("ix_paper_predictions_category", table_name="paper_predictions")
    op.drop_index("ix_paper_predictions_external_market_id", table_name="paper_predictions")
    op.drop_index("ix_paper_predictions_source", table_name="paper_predictions")
    op.drop_index("ix_paper_predictions_agent_id", table_name="paper_predictions")
    op.drop_index("ix_paper_predictions_run_id", table_name="paper_predictions")
    op.drop_table("paper_predictions")

    op.drop_index("ix_paper_markets_end_time", table_name="paper_markets")
    op.drop_index("ix_paper_markets_category", table_name="paper_markets")
    op.drop_index("ix_paper_markets_slug", table_name="paper_markets")
    op.drop_index("ix_paper_markets_external_id", table_name="paper_markets")
    op.drop_index("ix_paper_markets_source", table_name="paper_markets")
    op.drop_table("paper_markets")
