#!/usr/bin/env bash
set -euo pipefail

echo "[환경확인] Meta Harness Dev Container"
echo "Node: $(node --version)"
echo "npm: $(npm --version)"
echo "Git: $(git --version)"
echo "Make: $(make --version | head -n 1)"
echo "Bash: $BASH_VERSION"
if command -v jq >/dev/null 2>&1; then echo "jq: $(jq --version)"; fi
if command -v codex >/dev/null 2>&1; then echo "Codex: $(codex --version 2>/dev/null || echo installed)"; else echo "Codex: not installed"; fi
if [ "${META_HARNESS_DEVCONTAINER:-}" = "1" ]; then echo "[ok] Dev Container flag detected"; else echo "[warn] Dev Container flag not detected"; fi
echo "[ok] 환경 확인 완료"
