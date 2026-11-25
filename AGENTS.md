# Agent instructions

This is a learning repository for ICE FLE past-paper practice and general study.

## How to work here

- Use grill-me to sharpen a plan or an exam answer before writing notes or files.
- Use pstack after `/setup-pstack`. Start work with `/poteto-mode` and follow the playbook it selects.
- Put session write-ups in `notes/`. Put exploratory work in `explorations/` (one topic per folder or file). Put my own FLE answers and sitting notes in `fle/<sitting-id>/`.
- Look up official sittings in `fle/db/sittings.json` or `fle/db/fle.db`. Official PDFs stay on Google Drive; do not copy them into this repository. Rebuild the database with `python fle/db/init_db.py` if the catalog JSON changes.

## Do not

- Do not upload official ICE FLE scenario PDFs, examiner reports, guidance, or syllabus files.
- Notes may quote exam text.
- Do not change repository visibility; keep it public.
- Do not add secrets, credentials, or unrelated work files.
