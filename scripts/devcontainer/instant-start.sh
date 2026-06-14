#!/usr/bin/env bash
set -euo pipefail

bash ./scripts/devcontainer/first-run.sh

echo
read -r -p "1개 작업을 자동 실행할까요? [y/N] " answer
case "$answer" in
  y|Y|yes|YES)
    if [ -z "$(git tag --list 'checkpoint-auto-*' | tail -n 1)" ]; then
      bash ./scripts/agent/create-checkpoint.sh
    fi
    bash ./scripts/agent/auto-loop.sh --limit 1
    ;;
  *)
    echo "자동 실행하지 않았습니다. 실행하려면: make auto1"
    ;;
esac
