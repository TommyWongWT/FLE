# Grill-me prompt for an FLE answer

Use this after an unaided attempt. Do not run it as a substitute for writing the answer first.

The coach's Grok "Challenge my reasoning" button is a short AI prompt. It is not this playbook. Follow the playbook in `AGENTS.md` and the structure below.

Official scenario PDFs and examiner's reports are not in this repository. Open Tommy's private Drive copies (or another local private copy). Do not paste official question papers or long examiner-report quotations into this public repo.

## Required output shape (every question, every limb)

For the question under review, work in this order and do not skip a heading:

1. **Context** — Restate the scenario facts that matter, the role the question sets, and every limb of the question. List the limbs explicitly. If a fact is assumed, label it as an assumption.
2. **Options** — Give at least two realistic ways to handle the problem, each tied to this scenario (not generic textbook lists).
3. **Recommendation** — Choose one option and justify it for this sitting, this role, and these constraints.
4. **Residual risk** — What remains after the recommended action, who owns it, and what monitoring or fallback you would put in place.

## Rules the grill must enforce

- Answer **every limb**. If the attempt missed a limb, say so and fill it.
- **Apply the answer to this scenario.** Reject generic syllabus dumps that could be pasted onto any paper.
- Use the **examiner's report as evidence**, after the unaided attempt: common gaps, what stronger answers did, and whether this attempt falls into a reported trap. Cite the report by sitting and section in your own words; do not copy official sentences into the repo.
- Draw on more than one syllabus field when the question needs it. Questions are not one-module items.
- Stay in the first person as the named role ("this is how I would…").
- If official guidance or the report was not available, say so and do not invent quotations or marks.
- End with a short next-action list for a rewrite, not a claimed official mark.

## Suggested starter

```
Grill this FLE attempt using prompts/grill-me-fle.md.

Sitting: <id>
Question: <number and limbs>
Role given in the question: <role>

My unaided answer is below.
Examiner's-report notes I made (own words, with section references) are below.

Enforce: context, then options, then recommendation, then residual risk.
Answer every limb and apply the advice to this scenario only.
```
