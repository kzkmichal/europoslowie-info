"""Database writer for inserting scraped data."""
from typing import List, Dict, Any
from sqlalchemy import text
from .db import get_db_session
from .logger import setup_logger

logger = setup_logger(__name__)


class DatabaseWriter:
    """Write scraped data to database."""

    @staticmethod
    def upsert_meps(meps: List[Dict[str, Any]]) -> int:
        """
        Insert or update MEPs in database.

        Args:
            meps: List of MEP dictionaries

        Returns:
            Number of MEPs inserted/updated
        """
        if not meps:
            logger.warning("No MEPs to insert")
            return 0

        count = 0
        with get_db_session() as session:
            for mep in meps:
                try:
                    # Use INSERT ... ON CONFLICT DO UPDATE for upsert
                    query = text("""
                        INSERT INTO meps (
                            ep_id, slug, full_name, first_name, last_name,
                            national_party, ep_group, email, photo_url,
                            website_url, term_start, term_end, is_active
                        ) VALUES (
                            :ep_id, :slug, :full_name, :first_name, :last_name,
                            :national_party, :ep_group, :email, :photo_url,
                            :website_url, :term_start, :term_end, :is_active
                        )
                        ON CONFLICT (ep_id)
                        DO UPDATE SET
                            slug = EXCLUDED.slug,
                            full_name = EXCLUDED.full_name,
                            first_name = EXCLUDED.first_name,
                            last_name = EXCLUDED.last_name,
                            national_party = EXCLUDED.national_party,
                            ep_group = EXCLUDED.ep_group,
                            email = EXCLUDED.email,
                            photo_url = EXCLUDED.photo_url,
                            website_url = EXCLUDED.website_url,
                            term_end = EXCLUDED.term_end,
                            is_active = EXCLUDED.is_active,
                            updated_at = CURRENT_TIMESTAMP
                    """)

                    session.execute(query, {
                        'ep_id': mep['ep_id'],
                        'slug': mep.get('slug'),
                        'full_name': mep['full_name'],
                        'first_name': mep.get('first_name'),
                        'last_name': mep.get('last_name'),
                        'national_party': mep.get('national_party'),
                        'ep_group': mep.get('ep_group'),
                        'email': mep.get('email'),
                        'photo_url': mep.get('photo_url'),
                        'website_url': mep.get('website_url'),
                        'term_start': mep.get('term_start'),
                        'term_end': mep.get('term_end'),
                        'is_active': mep.get('is_active', True)
                    })

                    count += 1

                except Exception as e:
                    logger.error(f"Failed to insert MEP {mep.get('full_name')}: {e}")
                    continue

            session.commit()
            logger.info(f"✓ Inserted/updated {count} MEPs")

        return count

    @staticmethod
    def upsert_voting_session(session_data: Dict[str, Any]) -> int:
        """
        Insert or update voting session.

        Args:
            session_data: Voting session dictionary

        Returns:
            Session ID
        """
        with get_db_session() as session:
            query = text("""
                INSERT INTO voting_sessions (
                    session_number, start_date, end_date, location,
                    session_type, total_votes, status
                ) VALUES (
                    :session_number, :start_date, :end_date, :location,
                    :session_type, :total_votes, :status
                )
                ON CONFLICT (session_number)
                DO UPDATE SET
                    start_date = EXCLUDED.start_date,
                    end_date = EXCLUDED.end_date,
                    location = EXCLUDED.location,
                    session_type = EXCLUDED.session_type,
                    total_votes = EXCLUDED.total_votes,
                    status = EXCLUDED.status,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id
            """)

            result = session.execute(query, session_data)
            session_id = result.scalar()
            session.commit()

            logger.info(f"✓ Inserted/updated session {session_data['session_number']}")
            return session_id

    @staticmethod
    def insert_votes(votes: List[Dict[str, Any]]) -> int:
        """
        Insert votes (in bulk).

        Args:
            votes: List of vote dictionaries

        Returns:
            Number of votes inserted
        """
        if not votes:
            logger.warning("No votes to insert")
            return 0

        count = 0
        with get_db_session() as session:
            for vote in votes:
                try:
                    query = text("""
                        INSERT INTO votes (
                            session_id, mep_id, vote_number, title, title_en,
                            date, vote_choice, result, votes_for, votes_against,
                            votes_abstain, document_reference, document_url,
                            context_ai, stars_poland, stars_reasoning,
                            topic_category, policy_area
                        ) VALUES (
                            :session_id, :mep_id, :vote_number, :title, :title_en,
                            :date, :vote_choice, :result, :votes_for, :votes_against,
                            :votes_abstain, :document_reference, :document_url,
                            :context_ai, :stars_poland, :stars_reasoning,
                            :topic_category, :policy_area
                        )
                        ON CONFLICT (session_id, mep_id, vote_number) DO NOTHING
                    """)

                    session.execute(query, vote)
                    count += 1

                except Exception as e:
                    logger.error(f"Failed to insert vote {vote.get('vote_number')}: {e}")
                    continue

            session.commit()
            logger.info(f"✓ Inserted {count} votes")

        return count
