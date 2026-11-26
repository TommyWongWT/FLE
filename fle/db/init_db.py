#!/usr/bin/env python3
"""Build fle/db/fle.db from sittings.json. Official PDFs are not copied.

Catalog tables are rebuilt from sittings.json. Existing attempt rows are
copied back when the sitting is still in the catalog.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

DB_DIR = Path(__file__).resolve().parent
JSON_PATH = DB_DIR / "sittings.json"
SCHEMA_PATH = DB_DIR / "schema.sql"
DB_PATH = DB_DIR / "fle.db"

ATTEMPT_COLUMNS = (
    "attempt_uid",
    "sitting_id",
    "question",
    "started_at",
    "updated_at",
    "notes_path",
    "status",
)


def load_attempts(path: Path) -> list[tuple]:
    if not path.exists():
        return []
    conn = sqlite3.connect(path)
    try:
        tables = {
            row[0]
            for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()
        }
        if "attempts" not in tables:
            return []
        columns = {row[1] for row in conn.execute("PRAGMA table_info(attempts)").fetchall()}
        if "attempt_uid" not in columns:
            return []
        return conn.execute(
            "SELECT attempt_uid, sitting_id, question, started_at, updated_at, notes_path, status FROM attempts"
        ).fetchall()
    finally:
        conn.close()


def main() -> None:
    catalog = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    saved_attempts = load_attempts(DB_PATH)
    if DB_PATH.exists():
        DB_PATH.unlink()
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        sitting_ids = set()
        for sitting in catalog["sittings"]:
            sitting_ids.add(sitting["id"])
            conn.execute(
                "INSERT INTO sittings (id, year, season, slug, title, question_count, parts_json) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    sitting["id"],
                    sitting["year"],
                    sitting.get("season"),
                    sitting["slug"],
                    sitting["title"],
                    sitting["question_count"],
                    json.dumps(sitting.get("parts") or []),
                ),
            )
            for kind in ("scenario", "examiners_report"):
                doc = sitting[kind]
                conn.execute(
                    "INSERT INTO documents (kind, sitting_id, filename, pages, bytes, drive_id, drive_url) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (
                        kind,
                        sitting["id"],
                        doc["filename"],
                        doc.get("pages"),
                        doc.get("bytes"),
                        doc.get("drive_id"),
                        doc.get("drive_url"),
                    ),
                )
        for doc in catalog.get("reference_documents", []):
            conn.execute(
                "INSERT INTO documents (kind, sitting_id, filename, pages, bytes, drive_id, drive_url) "
                "VALUES (?, NULL, ?, ?, ?, ?, ?)",
                (
                    doc["id"],
                    doc["filename"],
                    doc.get("pages"),
                    doc.get("bytes"),
                    doc.get("drive_id"),
                    doc.get("drive_url"),
                ),
            )
        restored = 0
        for row in saved_attempts:
            if row[1] not in sitting_ids:
                continue
            conn.execute(
                "INSERT INTO attempts "
                "(attempt_uid, sitting_id, question, started_at, updated_at, notes_path, status) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                row,
            )
            restored += 1
        conn.commit()
    finally:
        conn.close()
    message = f"Wrote {DB_PATH}"
    if restored:
        message += f" (kept {restored} attempt row{'s' if restored != 1 else ''})"
    print(message)


if __name__ == "__main__":
    main()
