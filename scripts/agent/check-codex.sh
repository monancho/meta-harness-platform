#!/usr/bin/env bash
set -euo pipefail

if ! command -v codex >/dev/null 2>&1; then
  echo "[codex-check] Codex CLI가 없습니다. 설치를 시도합니다."
  npm install -g @openai/codex
fi

echo "[codex-check] Codex CLI: $(codex --version 2>/dev/null || echo installed)"

# codex doctor가 있으면 인증/설치 상태를 확인한다. 실패해도 친절하게 안내한다.
if codex doctor >/tmp/meta-harness-codex-doctor.log 2>&1; then
  echo "[codex-check] codex doctor 통과"
else
  echo "[codex-check:warn] codex doctor가 실패했습니다. 로그: /tmp/meta-harness-codex-doctor.log"
  echo "대부분 로그인/인증 문제입니다. 아래 명령을 한 번 실행하세요:"
  echo "  codex login"
  echo
  cat /tmp/meta-harness-codex-doctor.log | tail -40 || true
  exit 2
fi
