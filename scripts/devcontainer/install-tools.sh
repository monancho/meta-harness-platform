#!/usr/bin/env bash
set -euo pipefail

echo "[install-tools] 필수 도구 설치/확인"

corepack enable || true

# npm install은 package.json에 dependencies가 생긴 뒤를 대비한 선택적 처리입니다.
if [ -f package-lock.json ]; then
  npm ci || true
elif [ -f package.json ]; then
  npm install --ignore-scripts || true
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "[install-tools] Codex CLI 설치 시도: npm install -g @openai/codex"
  npm install -g @openai/codex || {
    echo "[install-tools:warn] Codex CLI 자동 설치 실패. 나중에 수동 실행: npm install -g @openai/codex"
  }
else
  echo "[ok] Codex CLI 이미 설치됨: $(codex --version 2>/dev/null | head -n 1 || echo installed)"
fi

if command -v gh >/dev/null 2>&1; then
  echo "[ok] GitHub CLI: $(gh --version | head -n 1)"
else
  echo "[warn] gh CLI 없음. PR 자동화 단계 전까지는 없어도 됩니다."
fi

echo "[install-tools] 완료"
