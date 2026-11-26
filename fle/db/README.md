# Past-paper database

This folder is a catalog of ICE Further Learning Exam sittings, not a copy of the official papers.

Official scenario PDFs, examiner reports, guidance, and syllabus stay on [Google Drive](https://drive.google.com/drive/folders/1lF5rH6ckpH3ZeRI6DLLNUOjzqqTm-s8u). Do not add those PDFs to GitHub. Notes may quote exam text.

## Files

- `sittings.json` — source of truth: 11 sittings plus guidance and syllabus, with Drive links, page counts, question counts, and any named parts
- `schema.sql` and `init_db.py` — build a local SQLite database
- `fle.db` — generated catalog (no official PDF bytes)

Rebuild the database:

```bash
python fle/db/init_db.py
```

A rebuild replaces the sittings and documents tables from `sittings.json` and keeps existing rows in the `attempts` table when the sitting is still in the catalog.

Your own answers and sitting notes go in `fle/<sitting-id>/`, not in this catalog. The coach also writes practice attempts to `fle/<sitting-id>/attempts/` and records them in `attempts`. See `fle/ATTEMPTS.md`.
