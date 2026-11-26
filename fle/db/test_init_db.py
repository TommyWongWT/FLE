import json
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

import init_db


class InitDbTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="fle-init-")
        self.addCleanup(self.temp.cleanup)
        self.dir = Path(self.temp.name)
        source = Path(__file__).resolve().parent
        (self.dir / "sittings.json").write_text((source / "sittings.json").read_text(encoding="utf-8"), encoding="utf-8")
        (self.dir / "schema.sql").write_text((source / "schema.sql").read_text(encoding="utf-8"), encoding="utf-8")
        self.db = self.dir / "fle.db"
        self._orig = (init_db.JSON_PATH, init_db.SCHEMA_PATH, init_db.DB_PATH)
        init_db.JSON_PATH = self.dir / "sittings.json"
        init_db.SCHEMA_PATH = self.dir / "schema.sql"
        init_db.DB_PATH = self.db
        self.addCleanup(self._restore)

    def _restore(self):
        init_db.JSON_PATH, init_db.SCHEMA_PATH, init_db.DB_PATH = self._orig

    def test_rebuilds_question_counts_and_keeps_attempts(self):
        init_db.main()
        conn = sqlite3.connect(self.db)
        counts = dict(conn.execute("SELECT id, question_count FROM sittings"))
        self.assertEqual(counts["2019-refugee-camp"], 6)
        self.assertEqual(counts["2021-spring-ppp-island-transport"], 6)
        self.assertEqual(counts["2026-spring-telfjordholme"], 5)
        parts = json.loads(conn.execute("SELECT parts_json FROM sittings WHERE id = '2026-spring-telfjordholme'").fetchone()[0])
        self.assertEqual([part["name"] for part in parts], ["Part 1", "Part 2", "Part 3"])
        conn.execute(
            "INSERT INTO attempts (attempt_uid, sitting_id, question, started_at, updated_at, notes_path, status) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("11111111-1111-1111-1111-111111111111", "2019-refugee-camp", "Q1", "2026-11-26", "2026-11-26", "fle/2019-refugee-camp/attempts/demo.md", "in_progress"),
        )
        conn.commit()
        conn.close()
        init_db.main()
        conn = sqlite3.connect(self.db)
        row = conn.execute("SELECT sitting_id, question, status FROM attempts WHERE attempt_uid = ?", ("11111111-1111-1111-1111-111111111111",)).fetchone()
        conn.close()
        self.assertEqual(row, ("2019-refugee-camp", "Q1", "in_progress"))


if __name__ == "__main__":
    unittest.main()
