#!/usr/bin/env bash
set -euo pipefail

bash -n ./scripts/agent/status.sh
bash -n ./scripts/agent/next-task.sh
bash -n ./scripts/agent/finish-task.sh
bash -n ./scripts/agent/run-codex-current-task.sh
bash -n ./scripts/agent/auto-loop.sh
bash -n ./scripts/agent/create-checkpoint.sh
bash -n ./scripts/agent/restore-checkpoint.sh
node --check ./scripts/agent/render-current-task.mjs
node --check ./scripts/agent/guard-diff.mjs

echo "[ok] autopilot scripts syntax passed"
