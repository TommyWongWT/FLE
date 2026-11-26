# Practice attempts

Write your own answers in `fle/<sitting-id>/attempts/`. This repository has no sample answers and must not contain official exam PDFs or copied question papers.

The local study coach still keeps a copy in browser storage. It also saves each attempt to a markdown file in the sitting folder and records a row in the `attempts` table in `fle/db/fle.db`. Browser data alone is not a backup: clearing the site, changing browser, or using another device can drop it.

## Layout

```
fle/<sitting-id>/attempts/<attempt-uid>.md
```

Use a copy of [`attempt-template.md`](./attempt-template.md) if you write by hand. The coach uses the same headings.

## Rules

- Do not invent or commit placeholder attempts.
- Do not put confidential project, employer, or client data in these files. This repository is public.
- Official papers stay in the private Drive folder. Short own-words notes from the examiner's report may go in the Evidence section.
- Rebuilding `fle.db` from `sittings.json` keeps existing attempt rows. The markdown files are the copy you can open in git.

Delete an attempt in the coach to remove the local file and database row. You still need to commit or drop a file yourself if it was already committed.
