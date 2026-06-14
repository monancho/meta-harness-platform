#!/usr/bin/env bash
set -euo pipefail

LIMIT="${1:-1}"
MODE="${2:-safe}"

cat <<MSG
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Meta Harness Instant Autopilot
- 실행할 작업 수: ${LIMIT}
- 모드: ${MODE}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MSG

bash ./scripts/agent/instant-autopilot.sh "$LIMIT" "$MODE"
