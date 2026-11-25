#!/usr/bin/env python3
"""Build fle/db/fle.db from sittings.json. Official PDFs are not copied."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

DB_DIR = Path(__file__).resolve().parent
JSON_PATH = DB_DIR / "sittings.json"
SCHEMA_PATH = DB_DIR / "schema.sql"
DB_PATH = DB_DIR / "fle.db"


def main() -> None:
    catalog = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    if DB_PATH.exists():
        DB_PATH.unlink()
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        for sitting in catalog["sittings"]:
            conn.execute(
                "INSERT INTO sittings (id, year, season, slug, title) VALUES (?, ?, ?, ?, ?)",
                (sitting["id"], sitting["year"], sitting.get("season"), sitting["slug"], sitting["title"]),
            )
            for kind in ("scenario", "examiners_report"):
                doc = sitting[kind]
                conn.execute(
                    "INSERT INTO documents (kind, sitting_id, filename, pages, bytes, drive_id, drive_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (kind, sitting["id"], doc["filename"], doc.get("pages"), doc.get("bytes"), doc.get("drive_id"), doc.get("drive_url")),
                )
        for doc in catalog.get("reference_documents", []):
            conn.execute(
                "INSERT INTO documents (kind, sitting_id, filename, pages, bytes, drive_id, drive_url) VALUES (?, NULL, ?, ?, ?, ?, ?)",
                (doc["id"], doc["filename"], doc.get("pages"), doc.get("bytes"), doc.get("drive_id"), doc.get("drive_url")),
            )
        conn.commit()
    finally:
        conn.close()
    print(f"Wrote {DB_PATH}")


if __name__ == "__main__":
    main()
