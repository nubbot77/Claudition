#!/usr/bin/env bash
# Claudition launcher for macOS and Linux.
#   ./start.sh           check prerequisites, install, build the UI, start on http://127.0.0.1:8000
#   ./start.sh --voice   also install the Kokoro neural voice (~1.9 GB download, once)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-8000}"
VOICE=0
[[ "${1:-}" == "--voice" ]] && VOICE=1

step() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
fail() { printf '\n\033[31m[x] %s\033[0m\n' "$1"; exit 1; }
has() { command -v "$1" >/dev/null 2>&1; }

step "Checking prerequisites"
has claude || fail "Claude Code is not installed. Install it, then run this script again:
    npm install -g @anthropic-ai/claude-code"
has uv || fail "uv (Python package manager) is not installed. Install it, then open a new terminal:
    curl -LsSf https://astral.sh/uv/install.sh | sh"
has npm || fail "Node.js 20+ is not installed. Get it from https://nodejs.org"

logged_in() { claude auth status 2>/dev/null | grep -q '"loggedIn": *true'; }
if ! logged_in; then
  echo "Claude Code is not signed in. Opening the sign-in flow (use your Claude Pro/Max account)..."
  claude auth login
  logged_in || fail "Still not signed in. Run 'claude auth login' and try again."
fi
echo "Claude Code signed in."
[[ -n "${ANTHROPIC_API_KEY:-}" ]] && echo "Note: ANTHROPIC_API_KEY is set. Claudition removes it for Claude calls so your subscription is used."

step "Installing backend"
cd "$ROOT/backend"
if [[ $VOICE == 1 ]]; then
  uv sync --inexact --extra voice
  step "Downloading voice model files (~350 MB, skipped if present)"
  uv run --no-sync python scripts/download_tts_models.py
else
  uv sync --inexact
fi

step "Building the interface"
cd "$ROOT/frontend"
[[ -d node_modules ]] || npm ci
if [[ ! -f dist/index.html ]] || [[ -n "$(find src index.html package.json -newer dist/index.html -type f -print -quit)" ]]; then
  npm run build
else
  echo "Up to date."
fi

URL="http://127.0.0.1:$PORT"
step "Starting Claudition on $URL  (Ctrl+C to stop)"
( sleep 3; if has open; then open "$URL"; elif has xdg-open; then xdg-open "$URL" >/dev/null 2>&1; fi ) &
cd "$ROOT/backend"
exec uv run --no-sync uvicorn app.main:app --host 127.0.0.1 --port "$PORT"
