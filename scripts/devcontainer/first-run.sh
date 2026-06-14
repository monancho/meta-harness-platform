#!/usr/bin/env bash
set -euo pipefail

cat <<'TITLE'

Meta Harness v1.4 — 인스턴트 시작 점검

TITLE

bash ./scripts/devcontainer/check-env.sh

echo
if command -v codex >/dev/null 2>&1; then
  echo "[ok] Codex CLI 설치됨"
  codex --version || true
else
  echo "[warn] Codex CLI가 없습니다. 자동 루프를 쓰려면 설치가 필요합니다."
  echo "      npm install -g @openai/codex"
fi

echo
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[ok] Git repo 확인됨"
else
  echo "[first-run] Git repo 초기화"
  git init
  git add .
  git commit -m "chore: initialize meta harness instant starter" || true
fi

echo
bash ./scripts/agent/status.sh

echo
cat <<'NEXT'
다음 선택지:

1) 안전하게 1개 작업만 자동 실행
   bash ./scripts/agent/create-checkpoint.sh
   bash ./scripts/agent/auto-loop.sh --limit 1

2) 3개 작업 자동 실행
   bash ./scripts/agent/auto-loop.sh --limit 3

3) Dev Container를 갈아엎을 각오의 yolo 모드
   bash ./scripts/agent/auto-loop.sh --limit 3 --mode yolo

문제가 생기면:
   bash ./scripts/agent/status.sh
   bash ./scripts/agent/restore-checkpoint.sh
NEXT
