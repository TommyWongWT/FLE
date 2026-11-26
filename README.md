# FLE

Learning repo for:

1. ICE Further Learning Exam past-paper practice with grill-me coaching
2. General learning with grill-me and pstack (`/setup-pstack`, `/poteto-mode`, and related skills)

## Timeline

The sitting this repo is aimed at is **23 March 2027 (Hong Kong time only)**. Application, Technical Submission, exam, and results dates, plus a week-by-week plan covering all 11 papers and the TS, are in [`fle/TIMELINE.md`](fle/TIMELINE.md). Recheck the official ICE pages linked there before you apply or upload.

## Layout

- `explorations/` — one topic per folder or file
- `notes/` — durable notes from grill-me or pstack sessions
- `fle/TIMELINE.md` — dates and a week-by-week plan for the 23 March 2027 sitting (Hong Kong time)
- `fle/db/` — past-paper catalog (metadata and Drive pointers only, including question counts)
- `fle/<sitting-id>/` — my own answers and attempts, by sitting
- `fle/technical-submission/` — Technical Submission draft and word counter
- `prompts/grill-me-fle.md` — grill-me playbook for FLE answers

## Past-paper database

The 11 official sittings are indexed in `fle/db/sittings.json` and `fle/db/fle.db`, including each paper's question count and any named parts. Official scenario PDFs, examiner reports, guidance, and syllabus stay off GitHub; open them from [this Drive folder](https://drive.google.com/drive/folders/1lF5rH6ckpH3ZeRI6DLLNUOjzqqTm-s8u). Notes may quote exam text.

## HTML study coach

The local [FLE Study Coach](./coach/) starts by letting you select one or more of the five compulsory [ICE syllabus modules](https://www.ice.org.uk/media/330jhpa4/ice-exams-syllabus.pdf). Create an optional Grok lesson and self-check, optionally cross-check it with Gemini, then choose a past-paper sitting and start an unaided attempt. All five modules remain relevant to the exam. The catalog does not map questions to modules: open the scenario and choose a relevant question yourself.

The coach also supports Grok review and challenge prompts, optional Gemini cross-checks, a user-built notes and weakness map, progress tracking, a pausable mock timer and technical submission preparation. The coach's Grok challenge button is a short AI prompt, not a substitute for the [grill-me playbook](prompts/grill-me-fle.md) in `AGENTS.md`. Open the linked papers on Drive and write your own answers; the app does not import official PDFs or know their contents.

### First-time setup on Windows

1. Download or clone this repository and open PowerShell in its extracted folder.
2. Install [Python 3.10 or newer](https://www.python.org/downloads/windows/) if needed, then reopen PowerShell.
3. Run:

```powershell
.\coach\start.ps1
```

The launcher checks Python and creates the ignored `.venv` automatically. It does not install Python or other packages, or overwrite an existing environment. If PowerShell blocks scripts, follow your organisation's execution policy or ask your administrator.

At the hidden prompts, enter your own [xAI](https://console.x.ai/) and [Gemini](https://aistudio.google.com/apikey) API keys, or press Enter to skip either provider. Never share keys in chat or commit them. Existing saved keys are retained and will not be requested again. Each key is encrypted for your Windows account and saved outside the repository in `%LOCALAPPDATA%\FLECoach\` as `xai-key.txt` or `gemini-key.txt`; neither is uploaded to GitHub. Keep the keys private even though they are encrypted. To replace one, delete its local file and run the launcher again.

The keys are decrypted into the local server's process environment while it runs and sent over HTTPS to their respective providers for API calls. Requests do not follow redirects. Encryption is not absolute protection: software running as your Windows user or an administrator may be able to access the keys. Protect your account and use provider spending limits.

The launcher opens <http://127.0.0.1:8765/>. Stop the server with Ctrl+C. An API key is needed only for its provider's AI feedback; the other features work without one. Set `XAI_MODEL` or `GEMINI_MODEL` to a model available to your account if the defaults `grok-4.7` or `gemini-3.8-flash` are unavailable. Set `FLE_COACH_PORT` before starting the server if port 8765 is occupied. Alternatively, set `XAI_API_KEY` or `GEMINI_API_KEY` in your shell before starting; the launcher uses those values without changing saved keys. Do not commit keys.

Use **Check APIs** to check Grok and Gemini together; each provider's status and any error are shown separately. It makes one authenticated model-information request per provider, sends no study text and generates no tokens. A successful check confirms that the model-information endpoint responded, not that generation access or billing is working; a key may also lack permission for the metadata endpoint even if other endpoints work. No check runs automatically; click again to refresh.

Notes, mock progress and feedback are saved in this browser on this device. Practice attempts are also written to `fle/<sitting-id>/attempts/` and recorded in the catalog `attempts` table (see `fle/ATTEMPTS.md`). Clearing site data, changing browser or port, or using a different device can still drop the browser copy. Use **Export backup** regularly and **Import backup** to restore; importing replaces the current browser data. Backups contain your study text, so protect them and do not commit confidential material. Rebuilding the database keeps attempt rows; it does not touch browser data or exported backups.

You can pause either timer whenever you need to; hiding or closing the page pauses it as well. The mock timer counts up to six hours of working time, and the session goal is a reminder, not a limit. The question checklist follows the selected sitting's count (five or six). Mock answers are separate practice attempts; use the checklist and mock review to track your paper. Verify the current exam and technical submission requirements with ICE.

Each AI request asks for confirmation. A lesson sends the selected module names, but not your notes or answers, as study data to xAI; practice review sends the selected fields, question/context, answer and review evidence, while submission review sends the submission fields. Requests may incur charges. Do not enter confidential project information or upload official documents. AI-generated lessons and self-check questions are not official ICE material, and feedback is not an official mark; supply your own sourced guidance and examiner-report notes for evidence-based review, and independently check citations and current requirements.

After Grok gives a lesson or feedback, **Cross-check with Gemini** sends that output and the associated learning fields, practice material or submission material to Google Gemini only after confirmation. The separate Gemini result is saved in the browser and included in backups. It is another fallible AI opinion, not an official mark or proof that Grok is correct; rerun it after changing the source material. Google's API terms and charges apply.

## Grill-me

For a real grill of an FLE answer, follow [`prompts/grill-me-fle.md`](prompts/grill-me-fle.md) and the playbook in `AGENTS.md`. Each question must be taken in order: context, then options, then recommendation, then residual risk. Every limb must be answered and applied to that sitting. Use the examiner's report from the private Drive copy as evidence after an unaided attempt.

## Technical Submission

Draft the TS in [`fle/technical-submission/`](fle/technical-submission/). The upload deadline for this sitting is **5 March 2027** (Hong Kong time date from ICE's key membership dates; recheck before upload). Count words with `python fle/technical-submission/wordcount.py`. Keep confidential employer, client, and project-identifying data out of this public repository.

## Rules

- Do not upload official scenario PDFs or examiner reports.
- Notes may quote exam text.
- Keep this repository public; do not change visibility.
