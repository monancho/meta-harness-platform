#!/usr/bin/env bash
set -euo pipefail

TAG="${1:-}"
if [ -z "$TAG" ] && [ -f .harness/agent-workspace/latest-checkpoint.txt ]; then
  TAG="$(cat .harness/agent-workspace/latest-checkpoint.txt)"
fi
if [ -z "$TAG" ]; then
  echo "사용법: bash ./scripts/agent/restore-checkpoint.sh <tag>" >&2
  echo "또는 latest-checkpoint.txt가 있어야 합니다." >&2
  exit 1
fi

echo "[restore] 복구 대상: $TAG"
git reset --hard "$TAG"
git clean -fd
echo "[restore] 완료"
