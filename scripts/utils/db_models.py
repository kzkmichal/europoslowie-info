"""
SQLAlchemy models for database tables.

These models mirror the Drizzle schema defined in frontend/lib/db/schema.ts
"""

from datetime import datetime, date
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Date, Text,
    Float, ForeignKey, create_engine
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class MEP(Base):
    """MEP (Member of European Parliament) model."""

    __tablename__ = 'meps'

    id = Column(Integer, primary_key=True)
    ep_id = Column('ep_id', Integer, nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    full_name = Column('full_name', String(255), nullable=False)
    first_name = Column('first_name', String(100))
    last_name = Column('last_name', String(100))
    national_party = Column('national_party', String(100))
    ep_group = Column('ep_group', String(100))
    photo_url = Column('photo_url', String(500))
    email = Column(String(255))
    website_url = Column('website_url', String(500))
    term_start = Column('term_start', DateTime, nullable=False)
    term_end = Column('term_end', DateTime)
    is_active = Column('is_active', Boolean, nullable=False, default=True)
    created_at = Column('created_at', DateTime, default=datetime.now)
    updated_at = Column('updated_at', DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    votes = relationship('Vote', back_populates='mep')


class VotingSession(Base):
    """Voting session model."""

    __tablename__ = 'voting_sessions'

    id = Column(Integer, primary_key=True)
    session_number = Column('session_number', String(50), nullable=False, unique=True)
    start_date = Column('start_date', DateTime, nullable=False)
    end_date = Column('end_date', DateTime, nullable=False)
    location = Column(String(100))
    session_type = Column('session_type', String(50))
    status = Column(String(50), nullable=False, default='completed')
    total_votes = Column('total_votes', Integer, default=0)

    # Relationships
    votes = relationship('Vote', back_populates='session')


class Vote(Base):
    """Individual vote record model."""

    __tablename__ = 'votes'

    id = Column(Integer, primary_key=True)
    session_id = Column('session_id', Integer, ForeignKey('voting_sessions.id'), nullable=False)
    mep_id = Column('mep_id', Integer, ForeignKey('meps.id'), nullable=False)
    vote_number = Column('vote_number', String(50))
    title = Column(Text, nullable=False)
    title_en = Column('title_en', Text)
    date = Column(Date, nullable=False)
    vote_choice = Column('vote_choice', String(20), nullable=False)  # FOR, AGAINST, ABSTAIN, ABSENT
    result = Column(String(20))  # ADOPTED, REJECTED
    votes_for = Column('votes_for', Integer)
    votes_against = Column('votes_against', Integer)
    votes_abstain = Column('votes_abstain', Integer)
    document_reference = Column('document_reference', String(100))
    document_url = Column('document_url', Text)
    context_ai = Column('context_ai', Text)
    stars_poland = Column('stars_poland', Integer)
    # Note: JSONB fields (stars_reasoning, arguments_for, arguments_against)
    # are omitted for now as they're not needed for initial data loading
    polish_votes_for = Column('polish_votes_for', Integer)
    polish_votes_against = Column('polish_votes_against', Integer)
    polish_votes_abstain = Column('polish_votes_abstain', Integer)
    polish_votes_absent = Column('polish_votes_absent', Integer)
    topic_category = Column('topic_category', String(100))
    policy_area = Column('policy_area', String(100))
    is_main = Column('is_main', Boolean, nullable=False, default=False)
    dec_label = Column('dec_label', Text)
    created_at = Column('created_at', DateTime, default=datetime.now)
    updated_at = Column('updated_at', DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    session = relationship('VotingSession', back_populates='votes')
    mep = relationship('MEP', back_populates='votes')


class VoteSource(Base):
    """Source URL record for a vote (document, procedure file, press release)."""

    __tablename__ = 'vote_sources'

    id = Column(Integer, primary_key=True)
    vote_number = Column('vote_number', String(50), nullable=False)
    url = Column(Text, nullable=False)
    name = Column(String(200), nullable=False)
    source_type = Column('source_type', String(50), nullable=False)
    # Allowed values: RCV_XML, VOT_XML, REPORT, PROCEDURE_OEIL, PRESS_RELEASE
    accessed_at = Column('accessed_at', DateTime)
    created_at = Column('created_at', DateTime, default=datetime.now)


class MonthlyStats(Base):
    """Monthly statistics model."""

    __tablename__ = 'monthly_stats'

    id = Column(Integer, primary_key=True)
    mep_id = Column('mep_id', Integer, ForeignKey('meps.id'), nullable=False)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    total_votes = Column('total_votes', Integer, nullable=False, default=0)
    votes_for = Column('votes_for', Integer, nullable=False, default=0)
    votes_against = Column('votes_against', Integer, nullable=False, default=0)
    votes_abstain = Column('votes_abstain', Integer, nullable=False, default=0)
    votes_absent = Column('votes_absent', Integer, nullable=False, default=0)
    attendance_rate = Column('attendance_rate', Float, nullable=False, default=0)
    ranking_among_poles = Column('ranking_among_poles', Integer)
    ranking_in_group = Column('ranking_in_group', Integer)
    questions_count = Column('questions_count', Integer, default=0)
    speeches_count = Column('speeches_count', Integer, default=0)
    reports_count = Column('reports_count', Integer, default=0)
    votes5_star = Column('votes_poland_5star', Integer, default=0)
    votes4_star = Column('votes_poland_4star', Integer, default=0)


# Helper function to create tables
def create_tables(db_url: str):
    """Create all tables in database."""
    engine = create_engine(db_url)
    Base.metadata.create_all(engine)
    print("Tables created successfully")


if __name__ == "__main__":
    import os
    from dotenv import load_dotenv

    load_dotenv()
    db_url = os.getenv('DATABASE_URL')

    if db_url:
        create_tables(db_url)
    else:
        print("Error: DATABASE_URL not set")
