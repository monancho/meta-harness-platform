#!/usr/bin/env bash
set -euo pipefail

LIMIT=1
MODE="safe"
while [ $# -gt 0 ]; do
  case "$1" in
    --limit) LIMIT="${2:-1}"; shift 2 ;;
    --mode) MODE="${2:-safe}"; shift 2 ;;
    --safe) MODE="safe"; shift ;;
    --yolo) MODE="yolo"; shift ;;
    *) echo "사용법: bash ./scripts/agent/auto-loop.sh --limit 3 --mode safe|yolo" >&2; exit 1 ;;
  esac
done

LOCK=".harness/agent-workspace/autoloop.lock"
mkdir -p .harness/agent-workspace
if [ -f "$LOCK" ]; then
  echo "[auto-loop:오류] 이미 자동 루프 lock이 있습니다: $LOCK" >&2
  echo "실행 중이 아니라면 삭제: rm -f $LOCK" >&2
  exit 1
fi
trap 'rm -f "$LOCK"' EXIT
echo "pid=$$ started=$(date -Iseconds)" > "$LOCK"

echo "[auto-loop] limit=$LIMIT mode=$MODE"
bash ./scripts/agent/create-checkpoint.sh || true

for i in $(seq 1 "$LIMIT"); do
  echo
  echo "[auto-loop] ===== 반복 $i / $LIMIT ====="
  bash ./scripts/agent/status.sh || true
  bash ./scripts/agent/next-task.sh
  bash ./scripts/agent/run-codex-current-task.sh --mode "$MODE"
  bash ./scripts/agent/finish-task.sh
  echo "[auto-loop] 반복 $i 완료"
done

echo "[auto-loop] 요청한 반복 완료"
bash ./scripts/agent/status.sh || true
