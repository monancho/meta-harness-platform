#!/usr/bin/env bash
set -euo pipefail

TASK="${1:-}"
if [ -z "$TASK" ]; then
  echo "Usage: bash ./scripts/agent/commit-task.sh MH-001" >&2
  exit 1
fi


# Provide a safe local/default identity for container-only commits.
git config --global init.defaultBranch main >/dev/null 2>&1 || true
if ! git config --global user.name >/dev/null 2>&1; then
  git config --global user.name "Meta Harness Dev" >/dev/null 2>&1 || true
fi
if ! git config --global user.email >/dev/null 2>&1; then
  git config --global user.email "meta-harness-dev@example.local" >/dev/null 2>&1 || true
fi

echo "[commit-task] checking status"
git status --short

echo "[commit-task] running verification"
bash ./scripts/agent/verify-after-task.sh

git add .
git commit -m "feat(${TASK}): complete task"

echo "[ok] committed feat(${TASK}): complete task"
echo "Next task: bash ./scripts/agent/task-cycle.sh MH-002"
