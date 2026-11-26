#!/usr/bin/env bash
# Create or reuse the local Python 3.10+ virtual environment for the FLE coach.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV="$ROOT/.venv"
PYTHON_BIN="$VENV/bin/python"

ok_python() {
  "$1" -c 'import sys, venv; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null
}

if [[ -e "$VENV" ]]; then
  if [[ ! -x "$PYTHON_BIN" ]] || ! ok_python "$PYTHON_BIN"; then
    echo "The existing .venv is not a working Python 3.10+ environment. Check it or recreate it manually; setup will not overwrite it." >&2
    exit 1
  fi
  echo "Using the existing local virtual environment."
else
  echo "First-time setup: looking for Python 3.10 or newer..."
  selected=""
  for name in python3.13 python3.12 python3.11 python3.10 python3 python; do
    if command -v "$name" >/dev/null 2>&1; then
      candidate="$(command -v "$name")"
      if ok_python "$candidate"; then
        selected="$candidate"
        break
      fi
    fi
  done
  if [[ -z "$selected" ]]; then
    echo "Python 3.10+ with venv was not found. Install Python 3.10 or newer and run this launcher again." >&2
    exit 1
  fi
  echo "Creating the local virtual environment. No packages need to be installed."
  if ! "$selected" -m venv --without-pip "$VENV" || [[ ! -x "$PYTHON_BIN" ]] || ! ok_python "$PYTHON_BIN"; then
    echo "Virtual environment creation failed. Check the Python installation and the .venv folder before retrying." >&2
    exit 1
  fi
  echo "Local virtual environment ready."
fi
