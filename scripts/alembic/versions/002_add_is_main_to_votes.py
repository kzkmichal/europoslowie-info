"""Add is_main column to votes table.

Revision ID: 002
Revises: 001
Create Date: 2026-02-23

is_main = True  → główne głosowanie na danym VOT-ITM (jak is_main w HowTheyVote)
                  Wykrywane na podstawie activity_label.pl z DEC:
                  - "całość tekstu"       → finalny głos na całość rezolucji
                  - "Wstępne porozumienie" → głos nad wstępnym porozumieniem legislacyjnym
                  - "Wniosek o odrzucenie" → wniosek o odrzucenie projektu

is_main = False → głosowanie nad poprawką do konkretnego artykułu/motywu/ustępu
                  (np. "B10-0558/2025 - Motyw E - Popr. 3")
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'votes',
        sa.Column('is_main', sa.Boolean(), nullable=False, server_default='false')
    )
    op.create_index('idx_votes_is_main', 'votes', ['is_main'])


def downgrade() -> None:
    op.drop_index('idx_votes_is_main', table_name='votes')
    op.drop_column('votes', 'is_main')
