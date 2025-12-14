"""Initial database schema

Revision ID: 001
Revises:
Create Date: 2024-12-13

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Table 1: meps (Members of European Parliament)
    op.create_table(
        'meps',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ep_id', sa.Integer(), nullable=False, unique=True),
        sa.Column('slug', sa.String(100), nullable=False, unique=True),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('first_name', sa.String(100)),
        sa.Column('last_name', sa.String(100)),
        sa.Column('national_party', sa.String(100)),
        sa.Column('ep_group', sa.String(100)),
        sa.Column('email', sa.String(255)),
        sa.Column('photo_url', sa.Text()),
        sa.Column('website_url', sa.Text()),
        sa.Column('term_start', sa.Date(), nullable=False),
        sa.Column('term_end', sa.Date()),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('ep_id > 0', name='valid_ep_id'),
        sa.CheckConstraint("slug ~ '^[a-z0-9-]+$'", name='valid_slug')
    )

    # Indexes for meps
    op.create_index('idx_meps_slug', 'meps', ['slug'])
    op.create_index('idx_meps_ep_group', 'meps', ['ep_group'])
    op.create_index('idx_meps_national_party', 'meps', ['national_party'])
    op.create_index('idx_meps_active', 'meps', ['is_active'], postgresql_where=sa.text('is_active = true'))

    # Table 2: voting_sessions
    op.create_table(
        'voting_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_number', sa.String(50), nullable=False, unique=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('location', sa.String(100)),
        sa.Column('session_type', sa.String(50)),
        sa.Column('total_votes', sa.Integer(), default=0),
        sa.Column('total_meps_present', sa.Integer()),
        sa.Column('status', sa.String(50), default='scheduled'),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint('end_date >= start_date', name='valid_dates'),
        sa.CheckConstraint("status IN ('scheduled', 'ongoing', 'completed')", name='valid_status')
    )

    # Indexes for voting_sessions
    op.create_index('idx_sessions_date', 'voting_sessions', [sa.desc('start_date')])
    op.create_index('idx_sessions_status', 'voting_sessions', ['status'])

    # Table 3: votes (Individual Voting Records)
    op.create_table(
        'votes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.Integer(), nullable=False),
        sa.Column('mep_id', sa.Integer(), nullable=False),
        sa.Column('vote_number', sa.String(50)),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('title_en', sa.Text()),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('vote_choice', sa.String(20), nullable=False),
        sa.Column('result', sa.String(20)),
        sa.Column('votes_for', sa.Integer()),
        sa.Column('votes_against', sa.Integer()),
        sa.Column('votes_abstain', sa.Integer()),
        sa.Column('document_reference', sa.String(100)),
        sa.Column('document_url', sa.Text()),
        sa.Column('context_ai', sa.Text()),
        sa.Column('stars_poland', sa.Integer()),
        sa.Column('stars_reasoning', JSONB),
        sa.Column('arguments_for', JSONB),
        sa.Column('arguments_against', JSONB),
        sa.Column('polish_votes_for', sa.Integer(), default=0),
        sa.Column('polish_votes_against', sa.Integer(), default=0),
        sa.Column('polish_votes_abstain', sa.Integer(), default=0),
        sa.Column('polish_votes_absent', sa.Integer(), default=0),
        sa.Column('topic_category', sa.String(100)),
        sa.Column('policy_area', sa.String(100)),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['session_id'], ['voting_sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['mep_id'], ['meps.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('session_id', 'mep_id', 'vote_number', name='unique_vote_record'),
        sa.CheckConstraint("vote_choice IN ('FOR', 'AGAINST', 'ABSTAIN', 'ABSENT')", name='valid_vote_choice'),
        sa.CheckConstraint("result IN ('ADOPTED', 'REJECTED', 'TIED')", name='valid_result'),
        sa.CheckConstraint('stars_poland IS NULL OR (stars_poland >= 1 AND stars_poland <= 5)', name='valid_stars')
    )

    # Indexes for votes (critical for performance)
    op.create_index('idx_votes_mep', 'votes', ['mep_id'])
    op.create_index('idx_votes_session', 'votes', ['session_id'])
    op.create_index('idx_votes_date', 'votes', [sa.desc('date')])
    op.create_index('idx_votes_stars', 'votes', [sa.desc('stars_poland')], postgresql_where=sa.text('stars_poland >= 4'))
    op.create_index('idx_votes_mep_stars', 'votes', ['mep_id', sa.desc('stars_poland')])
    op.create_index('idx_votes_category', 'votes', ['topic_category'])

    # Full-text search index
    op.execute("""
        CREATE INDEX idx_votes_title_search ON votes
        USING gin(to_tsvector('english', title))
    """)

    # Table 4: monthly_stats (Aggregate Statistics)
    op.create_table(
        'monthly_stats',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('mep_id', sa.Integer(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('total_votes', sa.Integer(), default=0),
        sa.Column('votes_for', sa.Integer(), default=0),
        sa.Column('votes_against', sa.Integer(), default=0),
        sa.Column('votes_abstain', sa.Integer(), default=0),
        sa.Column('votes_absent', sa.Integer(), default=0),
        sa.Column('sessions_total', sa.Integer(), default=0),
        sa.Column('sessions_attended', sa.Integer(), default=0),
        sa.Column('attendance_rate', sa.Numeric(5, 2)),
        sa.Column('questions_count', sa.Integer(), default=0),
        sa.Column('speeches_count', sa.Integer(), default=0),
        sa.Column('reports_count', sa.Integer(), default=0),
        sa.Column('ranking_among_poles', sa.Integer()),
        sa.Column('ranking_in_group', sa.Integer()),
        sa.Column('votes_poland_5star', sa.Integer(), default=0),
        sa.Column('votes_poland_4star', sa.Integer(), default=0),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['mep_id'], ['meps.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('mep_id', 'year', 'month', name='unique_monthly_stat'),
        sa.CheckConstraint('month BETWEEN 1 AND 12', name='valid_month'),
        sa.CheckConstraint('year >= 2024', name='valid_year'),
        sa.CheckConstraint('attendance_rate >= 0 AND attendance_rate <= 100', name='valid_attendance')
    )

    # Indexes for monthly_stats
    op.create_index('idx_monthly_stats_mep', 'monthly_stats', ['mep_id'])
    op.create_index('idx_monthly_stats_period', 'monthly_stats', [sa.desc('year'), sa.desc('month')])
    op.create_index('idx_monthly_stats_mep_period', 'monthly_stats', ['mep_id', sa.desc('year'), sa.desc('month')])

    # Table 5: questions (Parliamentary Questions)
    op.create_table(
        'questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('mep_id', sa.Integer(), nullable=False),
        sa.Column('question_number', sa.String(50), unique=True),
        sa.Column('subject', sa.Text(), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('addressed_to', sa.String(100)),
        sa.Column('date_submitted', sa.Date(), nullable=False),
        sa.Column('date_answered', sa.Date()),
        sa.Column('answer_text', sa.Text()),
        sa.Column('answered_by', sa.String(255)),
        sa.Column('quality_score', sa.Integer()),
        sa.Column('topics', JSONB),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['mep_id'], ['meps.id'], ondelete='CASCADE'),
        sa.CheckConstraint('quality_score IS NULL OR (quality_score >= 1 AND quality_score <= 10)', name='valid_quality')
    )

    # Indexes for questions
    op.create_index('idx_questions_mep', 'questions', ['mep_id'])
    op.create_index('idx_questions_date', 'questions', [sa.desc('date_submitted')])
    op.create_index('idx_questions_answered', 'questions', ['date_answered'], postgresql_where=sa.text('date_answered IS NOT NULL'))

    # Table 6: speeches (Parliamentary Speeches)
    op.create_table(
        'speeches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('mep_id', sa.Integer(), nullable=False),
        sa.Column('debate_topic', sa.Text(), nullable=False),
        sa.Column('speech_date', sa.Date(), nullable=False),
        sa.Column('duration_seconds', sa.Integer()),
        sa.Column('transcript', sa.Text()),
        sa.Column('video_url', sa.Text()),
        sa.Column('main_points', JSONB),
        sa.Column('tone', sa.String(50)),
        sa.Column('topics', JSONB),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['mep_id'], ['meps.id'], ondelete='CASCADE'),
        sa.CheckConstraint('duration_seconds > 0', name='valid_duration')
    )

    # Indexes for speeches
    op.create_index('idx_speeches_mep', 'speeches', ['mep_id'])
    op.create_index('idx_speeches_date', 'speeches', [sa.desc('speech_date')])

    # Table 7: committee_memberships
    op.create_table(
        'committee_memberships',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('mep_id', sa.Integer(), nullable=False),
        sa.Column('committee_code', sa.String(20), nullable=False),
        sa.Column('committee_name', sa.String(255), nullable=False),
        sa.Column('committee_name_en', sa.String(255)),
        sa.Column('role', sa.String(50), default='member'),
        sa.Column('from_date', sa.Date(), nullable=False),
        sa.Column('to_date', sa.Date()),
        sa.Column('is_current', sa.Boolean(), default=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['mep_id'], ['meps.id'], ondelete='CASCADE'),
        sa.CheckConstraint("role IN ('member', 'substitute', 'chair', 'vice-chair')", name='valid_role'),
        sa.CheckConstraint('to_date IS NULL OR to_date >= from_date', name='valid_dates')
    )

    # Indexes for committee_memberships
    op.create_index('idx_committee_mep', 'committee_memberships', ['mep_id'])
    op.create_index('idx_committee_current', 'committee_memberships', ['is_current'], postgresql_where=sa.text('is_current = true'))
    op.create_index('idx_committee_code', 'committee_memberships', ['committee_code'])


def downgrade() -> None:
    op.drop_table('committee_memberships')
    op.drop_table('speeches')
    op.drop_table('questions')
    op.drop_table('monthly_stats')
    op.drop_table('votes')
    op.drop_table('voting_sessions')
    op.drop_table('meps')
