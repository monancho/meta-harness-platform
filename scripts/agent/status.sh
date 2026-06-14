#!/usr/bin/env bash
set -euo pipefail

TASK_DIR=".harness/agent-workspace/tasks"
DONE_DIR=".harness/agent-workspace/completed"
CURRENT=".harness/agent-workspace/current-task.md"
BRANCH="$(git branch --show-current 2>/dev/null || echo 'no-git')"
mkdir -p "$DONE_DIR"

echo "[상태] 현재 브랜치: $BRANCH"
if [ -f "$CURRENT" ]; then
  CUR="$(grep -E '^# 현재 작업: ' "$CURRENT" | head -n 1 | sed 's/# 현재 작업: //')"
  echo "[상태] current-task: ${CUR:-unknown}"
else
  echo "[상태] current-task: 없음"
fi

NEXT=""
for f in "$TASK_DIR"/MH-*.task.json; do
  id="$(basename "$f" | sed -E 's/^(MH-[0-9]+).*/\1/')"
  if [ ! -f "$DONE_DIR/$id.done" ]; then
    NEXT="$id"
    break
  fi
done

echo "[상태] 다음 작업: ${NEXT:-없음}"
echo
echo "작업 목록:"
for f in "$TASK_DIR"/MH-*.task.json; do
  id="$(basename "$f" | sed -E 's/^(MH-[0-9]+).*/\1/')"
  title="$(jq -r '.koTitle // .title' "$f")"
  if [ -f "$DONE_DIR/$id.done" ]; then
    st="done"
  elif [[ "$BRANCH" == "feat/$id" ]]; then
    st="doing"
  else
    st="todo"
  fi
  printf '[%s] %s %s\n' "$st" "$id" "$title"
done
