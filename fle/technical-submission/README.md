# Technical Submission workspace

Use this folder to draft the ICE Further Learning Technical Submission (TS) for the 23 March 2027 sitting.

## Deadline

**Upload by 5 March 2027 (Hong Kong time).** This date is taken from [ICE key membership dates](https://www.ice.org.uk/join-ice/key-membership-dates), checked on 26 November 2026. A clock time on that day is not published there (unverified). Recheck before you upload.

The [Further Learning Exam](https://www.ice.org.uk/your-career/professional-qualification-support/getting-professionally-qualified/further-learning-exam) page says the TS must be uploaded three weeks before the exam, and that **failure to upload by the confirmed date means automatic deferral** to the next sitting. Follow the confirmed 5 March 2027 date unless ICE tells you otherwise.

See `fle/TIMELINE.md` for the surrounding plan and for source notes.

## Word count

The two ICE web pages above do not state a word range. ICE's Further Learning Exam Guidance (linked from the FLE page) requires about 500 words, and not fewer than 400 or more than 600. Recheck the current guidance before you finalise the draft.

Count words with:

```bash
python fle/technical-submission/wordcount.py fle/technical-submission/draft.md
```

The script counts words in the draft body and ignores HTML comments and a YAML-style header, if present.

## Confidential data

This repository is public. Keep employer, client, project, and personal-identifying details out of files you commit. Use role-level descriptions and anonymised figures. If you need a fuller evidence file, keep it outside the repo (or in a private local path that is not committed).

## Files

- `draft.md` — your working draft (starts empty of project content)
- `wordcount.py` — local word counter for the 400–600 band
