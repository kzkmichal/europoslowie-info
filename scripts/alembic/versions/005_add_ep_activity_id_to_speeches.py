"""Add ep_activity_id to speeches table.

This column is needed to uniquely identify speech records from the EP Open Data API
(activity_id field), enabling idempotent upserts.

Revision ID: 005
Revises: 004
"""

from alembic import op
import sqlalchemy as sa

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'speeches',
        sa.Column('ep_activity_id', sa.String(150), nullable=True),
    )
    op.create_unique_constraint(
        'uq_speeches_ep_activity_id',
        'speeches',
        ['ep_activity_id'],
    )


def downgrade() -> None:
    op.drop_constraint('uq_speeches_ep_activity_id', 'speeches', type_='unique')
    op.drop_column('speeches', 'ep_activity_id')
