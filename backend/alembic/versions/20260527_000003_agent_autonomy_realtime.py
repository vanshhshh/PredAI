"""agent autonomy and realtime outbox

Revision ID: 20260527_000003
Revises: 20260303_000002
Create Date: 2026-05-27 00:00:03
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260527_000003"
down_revision: Union[str, None] = "20260303_000002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_predictions",
        sa.Column("prediction_id", sa.String(), nullable=False),
        sa.Column("agent_id", sa.String(), nullable=False),
        sa.Column("market_id", sa.String(), nullable=False),
        sa.Column("owner", sa.String(), nullable=False),
        sa.Column("side", sa.String(), nullable=False),
        sa.Column("model_probability_bps", sa.Integer(), nullable=False),
        sa.Column("market_probability_bps", sa.Integer(), nullable=False),
        sa.Column("confidence_bps", sa.Integer(), nullable=False),
        sa.Column("edge_bps", sa.Integer(), nullable=False),
        sa.Column("stake_amount", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(), nullable=False, server_default="PAPER"),
        sa.Column("reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("tx_hash", sa.String(), nullable=True),
        sa.Column("source_snapshot", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("metrics", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("settled_outcome", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.agent_id"]),
        sa.ForeignKeyConstraint(["market_id"], ["markets.market_id"]),
        sa.PrimaryKeyConstraint("prediction_id"),
    )
    op.create_index("ix_agent_predictions_agent_id", "agent_predictions", ["agent_id"])
    op.create_index("ix_agent_predictions_market_id", "agent_predictions", ["market_id"])
    op.create_index("ix_agent_predictions_owner", "agent_predictions", ["owner"])

    op.create_table(
        "protocol_events",
        sa.Column("event_id", sa.String(), nullable=False),
        sa.Column("topic", sa.String(), nullable=False),
        sa.Column("event_key", sa.String(), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.PrimaryKeyConstraint("event_id"),
    )
    op.create_index("ix_protocol_events_topic", "protocol_events", ["topic"])
    op.create_index("ix_protocol_events_event_key", "protocol_events", ["event_key"])
    op.create_index("ix_protocol_events_event_type", "protocol_events", ["event_type"])


def downgrade() -> None:
    op.drop_index("ix_protocol_events_event_type", table_name="protocol_events")
    op.drop_index("ix_protocol_events_event_key", table_name="protocol_events")
    op.drop_index("ix_protocol_events_topic", table_name="protocol_events")
    op.drop_table("protocol_events")

    op.drop_index("ix_agent_predictions_owner", table_name="agent_predictions")
    op.drop_index("ix_agent_predictions_market_id", table_name="agent_predictions")
    op.drop_index("ix_agent_predictions_agent_id", table_name="agent_predictions")
    op.drop_table("agent_predictions")
