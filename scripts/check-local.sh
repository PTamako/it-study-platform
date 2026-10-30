#!/usr/bin/env bash
# Run locally on macOS/Linux with Node 22 and Python 3.12+.
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

printf '\n[1/6] Install exact dependencies\n'
npm ci
printf '\n[2/6] Generate reproducible local migration/test fixtures\n'
python3 scripts/generate_language_sentence_seed.py
printf '\n[3/6] Typecheck\n'
npm run typecheck
printf '\n[4/6] Unit/integration regression tests\n'
npm test
printf '\n[5/6] Production frontend build\n'
npm run build
printf '\n[6/6] Local-only D1 schema/migration validation\n'
npx wrangler d1 migrations apply it-study-platform-db --local

printf '\nAll local checks passed. No production database or deployment was changed.\n'
