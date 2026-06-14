#!/usr/bin/env bash
set -euo pipefail

TASK_DIR=".harness/agent-workspace/tasks"
DONE_DIR=".harness/agent-workspace/completed"
mkdir -p "$DONE_DIR"

git config --global core.pager cat >/dev/null 2>&1 || true
git config --global --add safe.directory "$(pwd)" >/dev/null 2>&1 || true

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[next-task] Git repo가 아니므로 초기화합니다."
  git init
  git add .
  git commit -m "chore: initialize meta harness starter" || true
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "[next-task:오류] 커밋되지 않은 변경사항이 있습니다. 먼저 finish-task.sh 또는 커밋/복구를 진행하세요." >&2
  git status --short >&2
  exit 1
fi

BASE=""
if git rev-parse --verify main >/dev/null 2>&1; then
  BASE="main"
elif git rev-parse --verify master >/dev/null 2>&1; then
  BASE="master"
else
  BASE="main"
  git branch -M main >/dev/null 2>&1 || true
fi

git switch "$BASE" >/dev/null 2>&1 || git checkout "$BASE" >/dev/null 2>&1 || true

NEXT=""
for f in "$TASK_DIR"/MH-*.task.json; do
  id="$(basename "$f" | sed -E 's/^(MH-[0-9]+).*/\1/')"
  if [ ! -f "$DONE_DIR/$id.done" ]; then
    NEXT="$id"
    break
  fi
done

if [ -z "$NEXT" ]; then
  echo "[next-task] 모든 작업이 완료되었습니다."
  exit 0
fi

echo "[next-task] 다음 작업: $NEXT"
bash ./scripts/agent/task-cycle.sh "$NEXT"
