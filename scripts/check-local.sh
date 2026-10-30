#!/usr/bin/env bash
# Run locally on macOS/Linux with Node 22 and Python >=3.8 (CI uses 3.12).
# This deliberately never connects to production D1 or deploys a Worker.
set -Eeuo pipefail

cd "$(dirname "$0")/.."
node_version="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$node_version" != "22" ]]; then
  printf 'Node 22 is required; current version: %s. Run nvm use 22 first.\n' "$(node -v)" >&2
  exit 1
fi
# Prefer CI Python 3.12, but allow the stdlib-only generator on macOS Python 3.8.
if [[ -n "${PYTHON_BIN:-}" ]]; then
  python_bin="$PYTHON_BIN"
  if ! command -v "$python_bin" >/dev/null 2>&1; then
    echo "Python not found: $python_bin" >&2
    exit 1
  fi
else
  python_bin=""
  for candidate in python3.12 python3.11 python3.10 python3.9 python3; do
    if command -v "$candidate" >/dev/null 2>&1; then
      python_bin="$candidate"
      break
    fi
  done
  if [[ -z "$python_bin" ]]; then
    echo 'Python 3.8+ is required.' >&2
    exit 1
  fi
fi

printf '\n[1/7] Verify Python interpreter and checked-out source encoding\n'
"$python_bin" - <<'PY'
import sys
from pathlib import Path

print("Python version:", sys.version.split()[0])
if sys.version_info < (3, 8):
    raise SystemExit("Python 3.8+ is required.")
if sys.version_info < (3, 10):
    print("Python 3.8/3.9 selected; CI uses Python 3.12.", file=sys.stderr)

source = Path("scripts/generate_language_sentence_seed.py")
try:
    source.read_text(encoding="utf-8")
except UnicodeDecodeError as error:
    raise SystemExit(
        f"{source} contains non-UTF-8 bytes at offset {error.start}. "
        "Check 'git status --short' and re-fetch the PR branch; "
        "do not overwrite uncommitted local changes."
    ) from error
print("UTF-8 source check: OK")
PY
"$python_bin" -m py_compile scripts/generate_language_sentence_seed.py

printf '\n[2/7] Install exact dependencies\n'
npm ci
printf '\n[3/7] Generate reproducible local migration/test fixtures\n'
"$python_bin" scripts/generate_language_sentence_seed.py
printf '\n[4/7] Typecheck\n'
npm run typecheck
printf '\n[5/7] Unit/integration regression tests\n'
npm test
printf '\n[6/7] Production frontend build\n'
npm run build
printf '\n[7/7] Local-only D1 schema/migration validation\n'
npx wrangler d1 migrations apply it-study-platform-db --local

printf '\nAll local checks passed. No production database or deployment was changed.\n'
