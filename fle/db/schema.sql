-- FLE past-paper catalog. Official PDFs are not stored in this repository.
-- Rebuild from sittings.json with: python fle/db/init_db.py
-- Attempt rows are preserved across a catalog rebuild.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sittings (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  season TEXT,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  parts_json TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('scenario', 'examiners_report', 'guidance', 'syllabus')),
  sitting_id TEXT REFERENCES sittings(id),
  filename TEXT NOT NULL,
  pages INTEGER,
  bytes INTEGER,
  drive_id TEXT,
  drive_url TEXT
);

CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_uid TEXT NOT NULL UNIQUE,
  sitting_id TEXT NOT NULL REFERENCES sittings(id),
  question TEXT,
  started_at TEXT,
  updated_at TEXT,
  notes_path TEXT,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'reviewed'))
);
