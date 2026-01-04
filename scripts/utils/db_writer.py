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
        errors = 0

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
                        # Default to current term start (July 16, 2024) if not provided
                        'term_start': mep.get('term_start') or '2024-07-16',
                        'term_end': mep.get('term_end'),
                        'is_active': mep.get('is_active', True)
                    })

                    # Commit after each successful insert to avoid transaction rollback issues
                    session.commit()
                    count += 1

                except Exception as e:
                    # Rollback the failed transaction
                    session.rollback()
                    errors += 1
                    logger.error(f"Failed to insert MEP {mep.get('full_name')}: {e}")
                    continue

            logger.info(f"✓ Inserted/updated {count} MEPs ({errors} failed)")

        return count

    @staticmethod
    def upsert_voting_sessions(sessions: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Insert or update voting sessions.

        Args:
            sessions: List of voting session dictionaries

        Returns:
            Dictionary mapping session_number to session_id
        """
        if not sessions:
            logger.warning("No sessions to insert")
            return {}

        session_ids = {}
        with get_db_session() as db_session:
            for session_data in sessions:
                try:
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

                    result = db_session.execute(query, {
                        'session_number': session_data['session_number'],
                        'start_date': session_data.get('start_date'),
                        'end_date': session_data.get('end_date'),
                        'location': session_data.get('location'),
                        'session_type': session_data.get('session_type', 'PLENARY'),
                        'total_votes': session_data.get('total_votes', 0),
                        'status': session_data.get('status', 'COMPLETED')
                    })

                    session_id = result.scalar()
                    session_ids[session_data['session_number']] = session_id
                    logger.info(f"✓ Inserted/updated session {session_data['session_number']}")

                except Exception as e:
                    logger.error(
                        f"Failed to insert session {session_data.get('session_number')}: {e}"
                    )
                    continue

            db_session.commit()

        logger.info(f"✓ Inserted/updated {len(session_ids)} sessions")
        return session_ids

    @staticmethod
    def insert_votes(
        votes: List[Dict[str, Any]],
        session_ids: Dict[str, int]
    ) -> int:
        """
        Insert votes (in bulk).

        Args:
            votes: List of vote dictionaries
            session_ids: Dictionary mapping session_number to session_id

        Returns:
            Number of votes inserted
        """
        if not votes:
            logger.warning("No votes to insert")
            return 0

        logger.info(f"Preparing to insert {len(votes)} vote records...")

        # First, get MEP ID mapping (ep_id -> database id)
        mep_id_map = DatabaseWriter._get_mep_id_mapping()

        if not mep_id_map:
            logger.error("No MEPs in database! Run MEPs scraper first.")
            return 0

        count = 0
        skipped = 0

        with get_db_session() as db_session:
            for vote in votes:
                try:
                    # Get session_id from session_number
                    session_number = vote.get('session_number')
                    session_id = session_ids.get(session_number)

                    if not session_id:
                        logger.warning(
                            f"Session {session_number} not found in database, skipping vote"
                        )
                        skipped += 1
                        continue

                    # Get MEP database ID
                    # Try by ep_id first, then by name matching
                    mep_id = None
                    if vote.get('mep_ep_id'):
                        mep_id = mep_id_map.get(vote['mep_ep_id'])

                    if not mep_id and vote.get('mep_name'):
                        # Try to find by name (fuzzy matching)
                        mep_id = DatabaseWriter._find_mep_by_name(
                            db_session,
                            vote['mep_name']
                        )

                    if not mep_id:
                        # Skip votes for non-Polish MEPs
                        skipped += 1
                        continue

                    # Insert vote
                    query = text("""
                        INSERT INTO votes (
                            session_id, mep_id, vote_number, title,
                            date, vote_choice, result,
                            votes_for, votes_against, votes_abstain,
                            document_reference
                        ) VALUES (
                            :session_id, :mep_id, :vote_number, :title,
                            :date, :vote_choice, :result,
                            :votes_for, :votes_against, :votes_abstain,
                            :document_reference
                        )
                        ON CONFLICT (session_id, mep_id, vote_number) DO NOTHING
                    """)

                    db_session.execute(query, {
                        'session_id': session_id,
                        'mep_id': mep_id,
                        'vote_number': vote['vote_number'],
                        'title': vote.get('title', 'No title')[:500],
                        'date': vote.get('date'),
                        'vote_choice': vote['vote_choice'],
                        'result': vote.get('result'),
                        'votes_for': vote.get('total_for', 0),
                        'votes_against': vote.get('total_against', 0),
                        'votes_abstain': vote.get('total_abstain', 0),
                        'document_reference': vote.get('document_reference')
                    })

                    count += 1

                    # Commit in batches to avoid huge transactions
                    if count % 1000 == 0:
                        db_session.commit()
                        logger.info(f"  Inserted {count} votes so far...")

                except Exception as e:
                    logger.error(
                        f"Failed to insert vote {vote.get('vote_number')}: {e}"
                    )
                    continue

            db_session.commit()
            logger.info(
                f"✓ Inserted {count} votes "
                f"({skipped} skipped - non-Polish MEPs or missing data)"
            )

        return count

    @staticmethod
    def _get_mep_id_mapping() -> Dict[int, int]:
        """
        Get mapping of EP ID to database ID for all MEPs.

        Returns:
            Dictionary mapping ep_id to database id
        """
        with get_db_session() as session:
            query = text("SELECT id, ep_id FROM meps WHERE is_active = true")
            result = session.execute(query)

            mep_map = {}
            for row in result:
                mep_map[row.ep_id] = row.id

            logger.info(f"Loaded {len(mep_map)} active MEPs from database")
            return mep_map

    @staticmethod
    def _find_mep_by_name(session, name: str) -> int:
        """
        Find MEP database ID by name (fuzzy matching).

        Args:
            session: Database session
            name: MEP full name

        Returns:
            MEP database ID or None
        """
        # Simple approach: exact match on full_name
        # In production, you might want more sophisticated matching
        query = text("""
            SELECT id FROM meps
            WHERE UPPER(full_name) = UPPER(:name)
            AND is_active = true
            LIMIT 1
        """)

        result = session.execute(query, {'name': name}).scalar()
        return result
