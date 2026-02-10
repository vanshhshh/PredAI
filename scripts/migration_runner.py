# File: scripts/migration_runner.py

"""
PURPOSE
-------
Controlled database migration runner.

This script:
- applies backend DB migrations in order
- records applied versions
- prevents double-application
- supports dry-run mode

DESIGN PRINCIPLES
-----------------
- Deterministic
- Idempotent
- Safe for CI/CD and production
"""

import os
import sys
import psycopg2
from pathlib import Path

DATABASE_URL = os.getenv("DATABASE_URL")
MIGRATIONS_DIR = Path("backend/persistence/migrations")
DRY_RUN = os.getenv("DRY_RUN") == "true"

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set")

def get_connection():
    return psycopg2.connect(DATABASE_URL)

def ensure_migration_table(conn):
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT now()
            );
            """
        )
    conn.commit()

def get_applied_migrations(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT version FROM schema_migrations")
        return {row[0] for row in cur.fetchall()}

def apply_migration(conn, path: Path):
    print(f"➡️  Applying migration {path.name}")

    with path.open() as f:
        sql = f.read()

    if DRY_RUN:
        print("   (dry-run)")
        return

    with conn.cursor() as cur:
        cur.execute(sql)
        cur.execute(
            "INSERT INTO schema_migrations (version) VALUES (%s)",
            (path.name,),
        )

    conn.commit()

def main():
    conn = get_connection()
    ensure_migration_table(conn)

    applied = get_applied_migrations(conn)

    migrations = sorted(
        MIGRATIONS_DIR.glob("*.sql"),
        key=lambda p: p.name,
    )

    for migration in migrations:
        if migration.name in applied:
            continue
        apply_migration(conn, migration)

    print("✅ Migrations complete.")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("❌ Migration failed:", e)
        sys.exit(1)
