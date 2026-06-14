#!/usr/bin/env bash
set -euo pipefail

TASK="${1:-}"
if [ -z "$TASK" ]; then
  echo "Usage: bash ./scripts/agent/run-codex-task.sh MH-001" >&2
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "[error] codex CLI not found in this container."
  echo "Install/use your preferred agent, or paste .harness/agent-workspace/current-task.md into your code agent."
  exit 1
fi

if ! [ -f .harness/agent-workspace/current-task.md ]; then
  bash ./scripts/agent/start-task.sh "$TASK" > .harness/agent-workspace/current-task.md
fi

codex exec \
  --cd . \
  --sandbox workspace-write \
  --ask-for-approval never \
  - < .harness/agent-workspace/current-task.md
