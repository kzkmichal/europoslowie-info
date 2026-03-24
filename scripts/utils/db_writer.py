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
    def get_all_mep_ep_ids() -> List[int]:
        """
        Return ep_id list for all active MEPs.

        Returns:
            List of EP numeric IDs
        """
        with get_db_session() as session:
            result = session.execute(text("SELECT ep_id FROM meps WHERE is_active = true"))
            return [row.ep_id for row in result]

    @staticmethod
    def upsert_questions(questions: List[Dict[str, Any]]) -> int:
        """
        Insert or update parliamentary questions.

        Args:
            questions: List of question dicts (must include mep_ep_id)

        Returns:
            Number of questions inserted/updated
        """
        if not questions:
            logger.warning("No questions to insert")
            return 0

        mep_id_map = DatabaseWriter._get_mep_id_mapping()
        count = 0
        errors = 0

        with get_db_session() as session:
            for q in questions:
                mep_id = mep_id_map.get(q.get('mep_ep_id'))
                if not mep_id:
                    logger.warning(f"MEP ep_id {q.get('mep_ep_id')} not found, skipping question")
                    errors += 1
                    continue

                try:
                    query = text("""
                        INSERT INTO questions (
                            mep_id, question_number, subject, question_text,
                            addressed_to, date_submitted, date_answered, answered_by
                        ) VALUES (
                            :mep_id, :question_number, :subject, :question_text,
                            :addressed_to, :date_submitted, :date_answered, :answered_by
                        )
                        ON CONFLICT (mep_id, question_number) DO UPDATE SET
                            subject = EXCLUDED.subject,
                            question_text = EXCLUDED.question_text,
                            addressed_to = EXCLUDED.addressed_to,
                            date_submitted = EXCLUDED.date_submitted,
                            date_answered = EXCLUDED.date_answered,
                            answered_by = EXCLUDED.answered_by
                    """)
                    session.execute(query, {
                        'mep_id': mep_id,
                        'question_number': q['question_number'],
                        'subject': q['subject'],
                        'question_text': q['question_text'],
                        'addressed_to': q['addressed_to'],
                        'date_submitted': q['date_submitted'],
                        'date_answered': q.get('date_answered'),
                        'answered_by': q.get('answered_by'),
                    })
                    session.commit()
                    count += 1
                except Exception as e:
                    session.rollback()
                    errors += 1
                    logger.error(f"Failed to insert question {q.get('question_number')}: {e}")

        logger.info(f"✓ Inserted/updated {count} questions ({errors} failed)")
        return count

    @staticmethod
    def upsert_speeches(speeches: List[Dict[str, Any]]) -> int:
        """
        Insert or update MEP speeches.

        Args:
            speeches: List of speech dicts (must include mep_ep_id)

        Returns:
            Number of speeches inserted/updated
        """
        if not speeches:
            logger.warning("No speeches to insert")
            return 0

        mep_id_map = DatabaseWriter._get_mep_id_mapping()
        count = 0
        errors = 0

        with get_db_session() as session:
            for s in speeches:
                mep_id = mep_id_map.get(s.get('mep_ep_id'))
                if not mep_id:
                    logger.warning(f"MEP ep_id {s.get('mep_ep_id')} not found, skipping speech")
                    errors += 1
                    continue

                try:
                    query = text("""
                        INSERT INTO speeches (
                            mep_id, ep_activity_id, debate_topic,
                            speech_date, duration_seconds, transcript
                        ) VALUES (
                            :mep_id, :ep_activity_id, :debate_topic,
                            :speech_date, :duration_seconds, :transcript
                        )
                        ON CONFLICT (ep_activity_id) DO UPDATE SET
                            mep_id = EXCLUDED.mep_id,
                            debate_topic = EXCLUDED.debate_topic,
                            speech_date = EXCLUDED.speech_date,
                            duration_seconds = EXCLUDED.duration_seconds,
                            transcript = EXCLUDED.transcript
                    """)
                    session.execute(query, {
                        'mep_id': mep_id,
                        'ep_activity_id': s['ep_activity_id'],
                        'debate_topic': s['debate_topic'],
                        'speech_date': s['speech_date'],
                        'duration_seconds': s.get('duration_seconds'),
                        'transcript': s.get('transcript'),
                    })

                    count += 1
                    if count % 500 == 0:
                        session.commit()
                        logger.info(f"  Inserted {count} speeches so far…")

                except Exception as e:
                    session.rollback()
                    errors += 1
                    logger.error(f"Failed to insert speech {s.get('ep_activity_id')}: {e}")

            session.commit()

        logger.info(f"✓ Inserted/updated {count} speeches ({errors} failed)")
        return count

    @staticmethod
    def backfill_monthly_stats_counts() -> None:
        """
        Update questions_count and speeches_count in monthly_stats based on
        actual data in the questions / speeches tables.
        """
        with get_db_session() as session:
            try:
                session.execute(text("""
                    UPDATE monthly_stats ms
                    SET questions_count = (
                        SELECT COUNT(*)
                        FROM questions q
                        WHERE q.mep_id = ms.mep_id
                          AND EXTRACT(YEAR  FROM q.date_submitted) = ms.year
                          AND EXTRACT(MONTH FROM q.date_submitted) = ms.month
                    )
                """))
                session.execute(text("""
                    UPDATE monthly_stats ms
                    SET speeches_count = (
                        SELECT COUNT(*)
                        FROM speeches s
                        WHERE s.mep_id = ms.mep_id
                          AND EXTRACT(YEAR  FROM s.speech_date) = ms.year
                          AND EXTRACT(MONTH FROM s.speech_date) = ms.month
                    )
                """))
                session.commit()
                logger.info("✓ Backfilled questions_count and speeches_count in monthly_stats")
            except Exception as e:
                session.rollback()
                logger.error(f"Failed to backfill monthly_stats counts: {e}")

    @staticmethod
    def upsert_mep_documents(docs: List[Dict[str, Any]]) -> int:
        """
        Insert or update MEP plenary documents.

        Args:
            docs: List of document dicts (must include mep_ep_id)

        Returns:
            Number of documents inserted/updated
        """
        if not docs:
            logger.warning("No documents to insert")
            return 0

        mep_id_map = DatabaseWriter._get_mep_id_mapping()
        count = 0
        errors = 0

        with get_db_session() as session:
            for doc in docs:
                mep_id = mep_id_map.get(doc.get('mep_ep_id'))
                if not mep_id:
                    logger.warning(
                        f"MEP ep_id {doc.get('mep_ep_id')} not found, skipping document"
                    )
                    errors += 1
                    continue

                try:
                    query = text("""
                        INSERT INTO mep_documents (
                            mep_id, ep_document_id, document_type, title,
                            document_date, role, committee, doc_url
                        ) VALUES (
                            :mep_id, :ep_document_id, :document_type, :title,
                            :document_date, :role, :committee, :doc_url
                        )
                        ON CONFLICT (mep_id, ep_document_id) DO UPDATE SET
                            document_type = EXCLUDED.document_type,
                            title = EXCLUDED.title,
                            document_date = EXCLUDED.document_date,
                            role = EXCLUDED.role,
                            committee = EXCLUDED.committee,
                            doc_url = EXCLUDED.doc_url,
                            updated_at = NOW()
                    """)
                    session.execute(query, {
                        'mep_id': mep_id,
                        'ep_document_id': doc['ep_document_id'],
                        'document_type': doc['document_type'],
                        'title': doc['title'],
                        'document_date': doc.get('document_date'),
                        'role': doc.get('role'),
                        'committee': doc.get('committee'),
                        'doc_url': doc['doc_url'],
                    })
                    count += 1
                    if count % 100 == 0:
                        session.commit()
                        logger.info(f"  Inserted {count} documents so far…")
                except Exception as e:
                    session.rollback()
                    errors += 1
                    logger.error(
                        f"Failed to insert document {doc.get('ep_document_id')}: {e}"
                    )

            session.commit()

        logger.info(f"✓ Inserted/updated {count} documents ({errors} failed)")
        return count

    @staticmethod
    def upsert_committee_memberships(memberships: List[Dict[str, Any]]) -> int:
        """
        Insert or update committee memberships.

        Conflict resolution: (mep_id, committee_code, from_date) — same MEP,
        same committee, same start date is the same membership record.

        Args:
            memberships: List of membership dicts (must include mep_ep_id)

        Returns:
            Number of records inserted/updated
        """
        if not memberships:
            logger.warning("No committee memberships to insert")
            return 0

        mep_id_map = DatabaseWriter._get_mep_id_mapping()
        count = 0
        errors = 0

        with get_db_session() as session:
            for m in memberships:
                mep_id = mep_id_map.get(m.get('mep_ep_id'))
                if not mep_id:
                    logger.warning(
                        f"MEP ep_id {m.get('mep_ep_id')} not found, skipping committee membership"
                    )
                    errors += 1
                    continue

                try:
                    query = text("""
                        INSERT INTO committee_memberships (
                            mep_id, committee_name, committee_code,
                            role, from_date, to_date, is_current
                        ) VALUES (
                            :mep_id, :committee_name, :committee_code,
                            :role, :from_date, :to_date, :is_current
                        )
                        ON CONFLICT (mep_id, committee_code, from_date) DO UPDATE SET
                            committee_name = EXCLUDED.committee_name,
                            role = EXCLUDED.role,
                            to_date = EXCLUDED.to_date,
                            is_current = EXCLUDED.is_current,
                            updated_at = NOW()
                    """)
                    session.execute(query, {
                        'mep_id': mep_id,
                        'committee_name': m['committee_name'],
                        'committee_code': m['committee_code'],
                        'role': m['role'],
                        'from_date': m.get('from_date'),
                        'to_date': m.get('to_date'),
                        'is_current': m.get('is_current', True),
                    })
                    count += 1
                    if count % 100 == 0:
                        session.commit()
                except Exception as e:
                    session.rollback()
                    errors += 1
                    logger.error(
                        f"Failed to insert committee membership for MEP {m.get('mep_ep_id')}: {e}"
                    )

            session.commit()

        logger.info(f"✓ Inserted/updated {count} committee memberships ({errors} failed)")
        return count

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
