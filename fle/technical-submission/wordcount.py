#!/usr/bin/env python3
"""Count words in a Technical Submission draft against the 400-600 guidance band."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

MIN_WORDS = 400
MAX_WORDS = 600
TARGET = 500


def visible_text(raw: str) -> str:
    text = re.sub(r"<!--.*?-->", " ", raw, flags=re.DOTALL)
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            text = text[end + 4 :]
    text = re.sub(r"^#+\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"[*_`]+", " ", text)
    return text


def count_words(raw: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", visible_text(raw)))


def verdict(count: int) -> str:
    if count < MIN_WORDS:
        return f"below the {MIN_WORDS}-{MAX_WORDS} band (about {TARGET} words)."
    if count > MAX_WORDS:
        return f"above the {MIN_WORDS}-{MAX_WORDS} band (about {TARGET} words)."
    return f"inside the {MIN_WORDS}-{MAX_WORDS} band (about {TARGET} words)."


def main() -> int:
    parser = argparse.ArgumentParser(description="Count words in a Technical Submission draft.")
    parser.add_argument("path", nargs="?", default=Path(__file__).with_name("draft.md"), type=Path)
    args = parser.parse_args()
    try:
        raw = args.path.read_text(encoding="utf-8")
    except OSError as exc:
        print(f"Could not read {args.path}: {exc}", file=sys.stderr)
        return 1
    count = count_words(raw)
    print(f"{args.path}: {count} words; {verdict(count)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
