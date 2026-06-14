#!/usr/bin/env bash
set -euo pipefail

echo "[devcontainer] postCreateCommand 시작"

WORKSPACE="$(pwd)"
git config --global --add safe.directory "$WORKSPACE" || true
git config --global init.defaultBranch main || true
git config --global core.pager cat || true

if ! git config --global user.name >/dev/null 2>&1; then
  git config --global user.name "Meta Harness Dev"
fi
if ! git config --global user.email >/dev/null 2>&1; then
  git config --global user.email "meta-harness-dev@example.local"
fi

corepack enable || true

bash ./scripts/devcontainer/check-env.sh

# Codex CLI는 네트워크/인증 환경에 따라 실패할 수 있으므로 실패해도 컨테이너 생성은 막지 않는다.
if ! command -v codex >/dev/null 2>&1; then
  echo "[devcontainer] codex CLI가 없습니다. 설치를 시도합니다. 실패해도 계속 진행합니다."
  npm install -g @openai/codex || echo "[devcontainer:warn] codex CLI 자동 설치 실패. 필요 시 수동 설치: npm install -g @openai/codex"
fi

if [ ! -d .git ]; then
  echo "[devcontainer] Git repo가 아니므로 초기화합니다."
  git init
  git add .
  git commit -m "chore: initialize meta harness ko autopilot starter" || true
fi

mkdir -p .harness/agent-workspace/completed .harness/agent-workspace/auto-runs

echo "[devcontainer] 준비 완료"
echo "처음 실행: bash ./scripts/agent/autopilot-preflight.sh"
echo "자동 1개 작업: bash ./scripts/agent/auto-loop.sh --limit 1 --mode safe"
