#!/usr/bin/env bash
set -euo pipefail

echo "[verify] doctor"
node ./bin/mh.mjs doctor

echo "[verify] agent-ready"
node ./scripts/agent/validate-agent-ready.mjs

echo "[verify] syntax check"
if [ -d packages ]; then
  while IFS= read -r file; do
    echo "[node --check] $file"
    node --check "$file"
  done < <(find packages bin scripts -name '*.mjs' -type f | sort)
else
  node --check ./bin/mh.mjs
  find scripts -name '*.mjs' -type f -print0 | xargs -0 -r -n1 node --check
fi

echo "[verify] smoke"
bash ./tests/smoke.sh

echo "[ok] verification passed"
