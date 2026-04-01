"""Fix questions unique constraint: question_number → (mep_id, question_number).

A single written question can have multiple Polish MEP co-authors. The old
UNIQUE(question_number) constraint stored only one record per question (the first
Polish MEP found). The new UNIQUE(mep_id, question_number) allows one record per
Polish MEP per question, so every co-author is properly attributed.

Also widens question_number from varchar(50) to varchar(100) to safely fit the
full EP identifier format (e.g. E-10-2025-005057).

Revision ID: 008
Revises: 007
"""

from alembic import op
import sqlalchemy as sa

revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop old single-column unique constraint if it exists (may not exist on fresh DB)
    op.execute("""
        ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_number_unique
    """)

    # Widen column to fit full EP identifier
    op.alter_column(
        'questions', 'question_number',
        type_=sa.String(100),
        existing_nullable=True,
    )

    # New composite unique constraint
    op.create_unique_constraint(
        'uq_questions_mep_question',
        'questions',
        ['mep_id', 'question_number'],
    )


def downgrade() -> None:
    op.drop_constraint('uq_questions_mep_question', 'questions', type_='unique')
    op.alter_column(
        'questions', 'question_number',
        type_=sa.String(50),
        existing_nullable=True,
    )
    op.create_unique_constraint(
        'questions_question_number_unique',
        'questions',
        ['question_number'],
    )
