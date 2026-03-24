"""Add vote_description column to votes table.

Stores AI-generated structured description for a vote (description, bullets, source_url).

Revision ID: 006
Revises: 005
"""

from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'votes',
        sa.Column('vote_description', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('votes', 'vote_description')
