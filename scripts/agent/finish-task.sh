#!/usr/bin/env bash
set -euo pipefail

BRANCH="$(git branch --show-current)"
if [[ ! "$BRANCH" =~ ^feat/(MH-[0-9]+)$ ]]; then
  echo "[finish-task:오류] 현재 브랜치가 feat/MH-XXX 형식이 아닙니다: $BRANCH" >&2
  exit 1
fi
TASK="${BASH_REMATCH[1]}"
DONE_DIR=".harness/agent-workspace/completed"
mkdir -p "$DONE_DIR"

echo "[finish-task] 작업 마무리: $TASK"

bash ./scripts/agent/verify-after-task.sh
node ./scripts/agent/guard-diff.mjs

touch "$DONE_DIR/$TASK.done"

git add .
if git diff --cached --quiet; then
  echo "[finish-task:오류] 커밋할 변경사항이 없습니다." >&2
  exit 1
fi

git commit -m "feat(${TASK}): complete task"

BASE=""
if git rev-parse --verify main >/dev/null 2>&1; then
  BASE="main"
elif git rev-parse --verify master >/dev/null 2>&1; then
  BASE="master"
else
  BASE="main"
  git branch -M main
fi

git switch "$BASE"
git merge --no-ff "$BRANCH" -m "merge: complete ${TASK}"

echo "[finish-task] 완료: $TASK"
echo "다음 작업: bash ./scripts/agent/next-task.sh"
