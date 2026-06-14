#!/usr/bin/env bash
set -euo pipefail

echo "[preflight] Dev Container / Autopilot 사전 점검"

if [ "${META_HARNESS_DEVCONTAINER:-}" != "1" ]; then
  echo "[preflight:경고] META_HARNESS_DEVCONTAINER=1이 아닙니다. Dev Container 안에서 실행하는 것을 권장합니다."
fi

bash ./scripts/devcontainer/check-env.sh
node ./scripts/agent/validate-agent-ready.mjs
bash -n ./scripts/agent/task-cycle.sh
bash -n ./scripts/agent/status.sh
bash -n ./scripts/agent/next-task.sh
bash -n ./scripts/agent/finish-task.sh
bash -n ./scripts/agent/run-codex-current-task.sh
bash -n ./scripts/agent/auto-loop.sh
node --check ./scripts/agent/guard-diff.mjs

if command -v codex >/dev/null 2>&1; then
  echo "[preflight] codex CLI: $(codex --version 2>/dev/null || echo installed)"
else
  echo "[preflight:경고] codex CLI가 없습니다. 설치: npm install -g @openai/codex"
fi

if find . -maxdepth 4 -name '.env*' | grep -q .; then
  echo "[preflight:경고] .env 계열 파일이 존재합니다. 자동 루프 전에 제거/이동하세요."
  find . -maxdepth 4 -name '.env*' -print
fi

bash ./tests/smoke.sh

echo "[preflight] 통과"
