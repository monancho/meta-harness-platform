#!/usr/bin/env bash
set -euo pipefail

LIMIT="${1:-1}"
MODE="${2:-safe}"

if [[ ! "$LIMIT" =~ ^[0-9]+$ ]]; then
  echo "사용법: bash ./scripts/agent/instant-autopilot.sh [limit] [safe|yolo]" >&2
  exit 1
fi
if [[ "$MODE" != "safe" && "$MODE" != "yolo" ]]; then
  echo "mode는 safe 또는 yolo만 가능합니다." >&2
  exit 1
fi

echo "[instant] limit=$LIMIT mode=$MODE"

echo "[instant] 1/4 환경 점검"
bash ./scripts/devcontainer/check-env.sh

echo "[instant] 2/4 agent-ready 점검"
node ./scripts/agent/validate-agent-ready.mjs

echo "[instant] 3/4 Codex CLI 점검"
if ! bash ./scripts/agent/check-codex.sh; then
  echo
  echo "[instant:중단] Codex CLI 인증이 필요합니다."
  echo "컨테이너 터미널에서 아래를 실행한 뒤 다시 ./GO.sh를 실행하세요:"
  echo "  codex login"
  exit 2
fi

echo "[instant] 4/4 자동 루프 시작"
bash ./scripts/agent/auto-loop.sh --limit "$LIMIT" --mode "$MODE"
