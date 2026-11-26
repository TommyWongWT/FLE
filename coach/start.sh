#!/usr/bin/env bash
# Start the local FLE study coach on Unix (macOS or Linux).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# shellcheck source=setup.sh
source "$SCRIPT_DIR/setup.sh"

PYTHON="$ROOT/.venv/bin/python"
SERVER="$SCRIPT_DIR/server.py"

if [[ -z "${XAI_API_KEY:-}" ]]; then
  echo "XAI_API_KEY is not set. Grok feedback will be unavailable until you export it in this shell."
fi
if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  echo "GEMINI_API_KEY is not set. Gemini cross-checks will be unavailable until you export it in this shell."
fi

echo "Starting the coach. Set FLE_COACH_PORT if port 8765 is in use. Stop with Ctrl+C."
exec "$PYTHON" "$SERVER" --open
