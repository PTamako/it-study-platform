#!/usr/bin/env bash
# Run locally on macOS/Linux with Node 22 and Python >=3.10 (CI uses 3.12).
# This deliberately never connects to production D1 or deploys a Worker.
set -Eeuo pipefail

cd "$(dirname "$0")/.."
node_version="$(node -p 'process.versions.node.split(".")[0]')"
if [[ "$node_version" != "22" ]]; then
  printf 'Node 22 is required; current version: %s. Run nvm use 22 first.\n' "$(node -v)" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo 'Python 3 is required to generate the licensed language sentence corpus.' >&2
  exit 1
fi

printf '\n[1/7] Verify Python interpreter and checked-out source encoding\n'
python3 - <<'PY'
import sys
from pathlib import Path

print("Python version:", sys.version.split()[0])
if sys.version_info < (3, 10):
    raise SystemExit("Python 3.10+ is required. Prefer Python 3.12 (used by CI).")

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
python3 -m py_compile scripts/generate_language_sentence_seed.py

printf '\n[2/7] Install exact dependencies\n'
npm ci
printf '\n[3/7] Generate reproducible local migration/test fixtures\n'
python3 scripts/generate_language_sentence_seed.py
printf '\n[4/7] Typecheck\n'
npm run typecheck
printf '\n[5/7] Unit/integration regression tests\n'
npm test
printf '\n[6/7] Production frontend build\n'
npm run build
printf '\n[7/7] Local-only D1 schema/migration validation\n'
npx wrangler d1 migrations apply it-study-platform-db --local

printf '\nAll local checks passed. No production database or deployment was changed.\n'
