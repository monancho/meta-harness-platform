#!/usr/bin/env bash
set -euo pipefail

if [ -f .harness/agent-workspace/.post-start-shown ]; then
  exit 0
fi
mkdir -p .harness/agent-workspace
cat <<'MSG'

────────────────────────────────────────────
Meta Harness v1.4 Dev Container가 열렸습니다.

처음이면:
  make start

자동 실행 1개:
  make auto1

상태 확인:
  make status
────────────────────────────────────────────
MSG
touch .harness/agent-workspace/.post-start-shown
