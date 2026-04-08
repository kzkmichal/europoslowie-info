"""Enable RLS on all public tables with read-only public SELECT policy.

Revision ID: 015
Revises: 014
"""

from alembic import op

revision = '015'
down_revision = '014'
branch_labels = None
depends_on = None

TABLES = [
    'meps',
    'voting_sessions',
    'vote_items',
    'votes',
    'monthly_stats',
    'questions',
    'speeches',
    'committee_memberships',
    'vote_sources',
    'mep_documents',
    'alembic_version',
]


def upgrade() -> None:
    for table in TABLES:
        op.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')
        op.execute(f'ALTER TABLE {table} FORCE ROW LEVEL SECURITY')
        op.execute(
            f"CREATE POLICY allow_public_read ON {table} "
            f"FOR SELECT TO anon, authenticated USING (true)"
        )


def downgrade() -> None:
    for table in TABLES:
        op.execute(f'DROP POLICY IF EXISTS allow_public_read ON {table}')
        op.execute(f'ALTER TABLE {table} DISABLE ROW LEVEL SECURITY')
