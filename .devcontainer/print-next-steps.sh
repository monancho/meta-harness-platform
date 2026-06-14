#!/usr/bin/env bash
set -euo pipefail

echo
cat <<'MSG'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Meta Harness KO Instant Starter

컨테이너가 열렸습니다.

1) 사전 점검 + 1개 작업 자동 실행:
   ./GO.sh

2) 3개 작업 자동 실행:
   ./GO.sh 3 safe

3) 컨테이너를 버릴 각오로 강한 자동 실행:
   ./GO.sh 3 yolo

상태 확인:
   bash ./scripts/agent/status.sh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MSG
