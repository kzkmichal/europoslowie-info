"""Add mep_documents table for plenary documents (reports, resolutions).

Stores documents authored by MEPs: sprawozdania (REPORT_PLENARY),
projekty rezolucji (RESOLUTION_MOTION), wspólne projekty (RESOLUTION_MOTION_JOINT).

Revision ID: 007
Revises: 006
"""

from alembic import op
import sqlalchemy as sa

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'mep_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('mep_id', sa.Integer(), sa.ForeignKey('meps.id'), nullable=False),
        sa.Column('ep_document_id', sa.String(100), nullable=False),
        sa.Column('document_type', sa.String(30), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('document_date', sa.Date(), nullable=True),
        sa.Column('role', sa.String(20), nullable=True),
        sa.Column('committee', sa.String(20), nullable=True),
        sa.Column('doc_url', sa.Text(), nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('mep_id', 'ep_document_id', name='uq_mep_documents_mep_doc'),
    )
    op.create_index('ix_mep_documents_mep_id', 'mep_documents', ['mep_id'])


def downgrade() -> None:
    op.drop_index('ix_mep_documents_mep_id', table_name='mep_documents')
    op.drop_table('mep_documents')
