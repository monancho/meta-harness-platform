#!/usr/bin/env bash
set -euo pipefail
TASK_ID="${1:-MH-001}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

TASK_FILE="$(grep -A4 "id: ${TASK_ID}" .harness/agent-workspace/backlog.yml | awk '/taskFile:/ {print $2; exit}')"
if [[ -z "${TASK_FILE}" || ! -f "${TASK_FILE}" ]]; then
  echo "[agent:start:error] task not found: ${TASK_ID}" >&2
  exit 1
fi

echo "[agent:start] repository: $ROOT"
echo "[agent:start] task: $TASK_ID"
echo "[agent:start] task file: $TASK_FILE"
echo
echo "Read order:"
echo "  1. AGENTS.md"
echo "  2. docs/AGENT_START_HERE.md"
echo "  3. docs/AGENT_TASK_INDEX.md"
echo "  4. $TASK_FILE"
echo
echo "Baseline commands:"
echo "  node ./scripts/agent/validate-agent-ready.mjs"
echo "  bash ./tests/smoke.sh"
echo
echo "Task packet:"
cat "$TASK_FILE"
