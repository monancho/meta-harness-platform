#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[checkpoint:오류] Git repo가 아닙니다." >&2
  exit 1
fi
TAG="checkpoint-before-auto-$(date +%Y%m%d-%H%M%S)"
git tag "$TAG"
echo "$TAG" > .harness/agent-workspace/latest-checkpoint.txt
echo "[checkpoint] 생성: $TAG"
