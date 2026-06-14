#!/usr/bin/env bash
set -euo pipefail

echo "[instant-setup] Meta Harness v1.4 Dev Container 초기 설정 시작"

WORKSPACE="$(pwd)"
git config --global --add safe.directory "$WORKSPACE" || true
git config --global init.defaultBranch main || true
git config --global core.pager cat || true

if ! git config --global user.name >/dev/null 2>&1; then
  git config --global user.name "Meta Harness Dev"
fi
if ! git config --global user.email >/dev/null 2>&1; then
  git config --global user.email "meta-harness-dev@example.local"
fi

corepack enable || true

# package.json은 외부 dependency가 거의 없지만, lockfile/패키지 상태를 표준화한다.
if [ -f package.json ]; then
  npm install || true
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "[instant-setup] Codex CLI가 없어 설치를 시도합니다."
  npm install -g @openai/codex || echo "[instant-setup:warn] Codex CLI 설치 실패. GO.sh 실행 시 다시 안내합니다."
else
  echo "[instant-setup] Codex CLI 감지: $(codex --version 2>/dev/null || echo installed)"
fi

bash ./scripts/devcontainer/check-env.sh || true

if [ ! -d .git ]; then
  echo "[instant-setup] Git repo가 아니므로 초기화합니다."
  git init
  git add .
  git commit -m "chore: initialize meta harness instant starter" || true
fi

mkdir -p .harness/agent-workspace/completed .harness/agent-workspace/auto-runs

cat > INSTANT_NEXT_STEPS.md <<'NEXT'
# 다음 단계

Dev Container가 열렸습니다.

## 가장 쉬운 시작

```bash
./GO.sh
```

## 3개 작업 자동 실행

```bash
./GO.sh 3 safe
```

## 강한 모드

```bash
./GO.sh 3 yolo
```

## 상태 확인

```bash
bash ./scripts/agent/status.sh
```
NEXT

echo "[instant-setup] 준비 완료"
echo "[instant-setup] 다음 명령: ./GO.sh"
