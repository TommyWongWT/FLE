# Agent instructions

This is a learning repository for ICE FLE past-paper practice and general study.

## Grill-me for FLE answers

After an unaided attempt, use the playbook in `prompts/grill-me-fle.md`. For every question, work in this order and do not skip a heading:

1. **Context** — scenario facts, the named role, and every limb of the question, with assumptions labelled
2. **Options** — at least two realistic courses of action, applied to this sitting
3. **Recommendation** — one option, justified for this role and these constraints
4. **Residual risk** — what remains, who owns it, and the fallback

Answer every limb. Apply the advice to this scenario; reject generic syllabus dumps. Use the examiner's report from Tommy's private Drive copy (not this repo) as evidence, in your own words, after the unaided attempt. The coach's Grok "Challenge my reasoning" button is a short AI prompt, not this playbook.

## How to work here

- Use grill-me to sharpen a plan or an exam answer before writing notes or files.
- Use pstack after `/setup-pstack`. Start work with `/poteto-mode` and follow the playbook it selects.
- Put session write-ups in `notes/`. Put exploratory work in `explorations/` (one topic per folder or file). Put my own FLE answers, sitting notes, and coach-saved attempts in `fle/<sitting-id>/`.
- Look up official sittings in `fle/db/sittings.json` or `fle/db/fle.db`. Official PDFs stay on Google Drive; do not copy them into this repository. Rebuild the database with `python fle/db/init_db.py` if the catalog JSON changes; attempt rows are kept.

## Do not

- Do not upload official ICE FLE scenario PDFs, examiner reports, guidance, or syllabus files.
- Notes may quote exam text.
- Do not change repository visibility; keep it public.
- Do not add secrets, credentials, or unrelated work files.
