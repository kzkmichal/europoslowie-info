"""Seed database with test data for development."""
import os
import sys
from datetime import date, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable not set")
    sys.exit(1)

# Create database engine
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


def seed_minimal():
    """Seed minimal test data (5 MEPs, 20 votes)"""
    session = Session()

    try:
        print("Seeding minimal test data...")

        # Insert test MEPs
        session.execute(text("""
            INSERT INTO meps (ep_id, slug, full_name, first_name, last_name,
                              national_party, ep_group, term_start, is_active)
            VALUES
                (124936, 'jan-kowalski', 'Jan Kowalski', 'Jan', 'Kowalski',
                 'PiS', 'ECR', '2024-07-16', true),
                (197490, 'anna-nowak', 'Anna Nowak', 'Anna', 'Nowak',
                 'KO', 'EPP', '2024-07-16', true),
                (183725, 'piotr-wisniewski', 'Piotr Wiśniewski', 'Piotr', 'Wiśniewski',
                 'Lewica', 'S&D', '2024-07-16', true),
                (156892, 'maria-kowalczyk', 'Maria Kowalczyk', 'Maria', 'Kowalczyk',
                 'Konfederacja', 'NI', '2024-07-16', true),
                (145623, 'tomasz-nowicki', 'Tomasz Nowicki', 'Tomasz', 'Nowicki',
                 'Polska 2050', 'Renew', '2024-07-16', true)
            ON CONFLICT (ep_id) DO NOTHING
        """))

        print("✓ Created 5 test MEPs")

        # Insert test voting session
        session.execute(text("""
            INSERT INTO voting_sessions (session_number, start_date, end_date,
                                          location, session_type, status)
            VALUES ('2024-11-TEST', '2024-11-12', '2024-11-15',
                    'Strasbourg', 'plenary', 'completed')
            ON CONFLICT (session_number) DO NOTHING
        """))

        print("✓ Created 1 test voting session")

        # Get session and MEP IDs
        session_result = session.execute(text(
            "SELECT id FROM voting_sessions WHERE session_number = '2024-11-TEST'"
        ))
        session_id = session_result.scalar()

        mep_results = session.execute(text("SELECT id FROM meps ORDER BY id LIMIT 5"))
        mep_ids = [row[0] for row in mep_results.fetchall()]

        # Insert test votes (4 votes per MEP = 20 total)
        vote_data = [
            {
                'vote_number': 'TEST-001',
                'title': 'Budżet UE 2025 - Fundusz Spójności',
                'stars': 5,
                'context': 'Głosowanie nad zwiększeniem Funduszu Spójności o 12%, co bezpośrednio wpływa na Polskę jako głównego beneficjenta.'
            },
            {
                'vote_number': 'TEST-002',
                'title': 'Wspólna Polityka Rolna - cięcia budżetowe',
                'stars': 4,
                'context': 'Decyzja o zmniejszeniu budżetu WPR o 3%, co może wpłynąć na polskich rolników.'
            },
            {
                'vote_number': 'TEST-003',
                'title': 'Green Deal - regulacje klimatyczne',
                'stars': 3,
                'context': 'Nowe regulacje dotyczące redukcji emisji CO2 w przemyśle.'
            },
            {
                'vote_number': 'TEST-004',
                'title': 'Procedura administracyjna',
                'stars': 1,
                'context': 'Rutynowe głosowanie proceduralne bez wpływu na Polskę.'
            }
        ]

        vote_choices = ['FOR', 'FOR', 'AGAINST', 'FOR', 'ABSTAIN']

        for vote in vote_data:
            for i, mep_id in enumerate(mep_ids):
                session.execute(text("""
                    INSERT INTO votes (session_id, mep_id, vote_number, title, date,
                                       vote_choice, result, stars_poland, context_ai,
                                       topic_category)
                    VALUES (:session_id, :mep_id, :vote_number, :title, :date,
                            :vote_choice, 'ADOPTED', :stars, :context, 'budget')
                    ON CONFLICT (session_id, mep_id, vote_number) DO NOTHING
                """), {
                    'session_id': session_id,
                    'mep_id': mep_id,
                    'vote_number': vote['vote_number'],
                    'title': vote['title'],
                    'date': date(2024, 11, 12),
                    'vote_choice': vote_choices[i],
                    'stars': vote['stars'],
                    'context': vote['context']
                })

        print("✓ Created 20 test votes (5 MEPs × 4 votes each)")

        # Insert test monthly stats
        for mep_id in mep_ids:
            session.execute(text("""
                INSERT INTO monthly_stats
                    (mep_id, year, month, total_votes, votes_for, votes_against,
                     sessions_attended, sessions_total, attendance_rate)
                VALUES
                    (:mep_id, 2024, 11, 4, 3, 1, 4, 4, 100.00)
                ON CONFLICT (mep_id, year, month) DO NOTHING
            """), {'mep_id': mep_id})

        print("✓ Created monthly stats for 5 MEPs")

        session.commit()
        print("\n✅ Database seeded successfully!")
        print(f"\nYou can now:")
        print(f"  - View MEPs: SELECT * FROM meps;")
        print(f"  - View votes: SELECT * FROM votes;")
        print(f"  - Check stats: SELECT * FROM monthly_stats;")

    except Exception as e:
        session.rollback()
        print(f"\n❌ Error seeding database: {e}")
        raise
    finally:
        session.close()


def seed_full():
    """Seed full test data (53 MEPs, 150 votes) - TODO"""
    print("Full seed not implemented yet. Use --minimal for now.")
    pass


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Seed database with test data')
    parser.add_argument('--minimal', action='store_true', help='Seed minimal data (default)')
    parser.add_argument('--full', action='store_true', help='Seed full test data')

    args = parser.parse_args()

    if args.full:
        seed_full()
    else:
        seed_minimal()
