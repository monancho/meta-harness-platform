#!/usr/bin/env bash
set -euo pipefail

MODE="safe"
while [ $# -gt 0 ]; do
  case "$1" in
    --mode) MODE="${2:-safe}"; shift 2 ;;
    --safe) MODE="safe"; shift ;;
    --yolo) MODE="yolo"; shift ;;
    *) echo "사용법: bash ./scripts/agent/run-codex-current-task.sh [--mode safe|yolo]" >&2; exit 1 ;;
  esac
done

TASK_PROMPT=".harness/agent-workspace/current-task.md"
LOG_DIR=".harness/agent-workspace/auto-runs/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOG_DIR"

if [ ! -f "$TASK_PROMPT" ]; then
  echo "[run-codex:오류] current-task.md가 없습니다. 먼저 실행하세요: bash ./scripts/agent/next-task.sh" >&2
  exit 1
fi
if ! command -v codex >/dev/null 2>&1; then
  echo "[run-codex:오류] Dev Container 안에서 codex CLI를 찾지 못했습니다." >&2
  echo "설치 예: npm install -g @openai/codex" >&2
  exit 1
fi

cat > "$LOG_DIR/prompt.md" <<'PROMPT'
당신은 Dev Container 내부에서 작업 중인 Codex 구현 에이전트입니다.
이 컨테이너와 레포는 실험용으로 취급해도 되지만, 아래 규칙은 반드시 지켜야 합니다.

필수 진행 순서:
1. AGENTS.md를 먼저 읽습니다.
2. .harness/agent-workspace/current-task.md를 읽습니다.
3. current-task.md가 가리키는 원본 task packet JSON을 읽습니다.
4. editableScope / forbiddenScope / command-policy / quality-gates를 확인합니다.
5. 현재 작업만 구현합니다.
6. 검증을 직접 실행하고 실패하면 1~2회까지 집중 수정합니다.

허용:
- workspace 내부 파일 읽기/수정
- Node/bash/git/make 기반 검증 명령 실행
- 현재 task 범위 내 리팩터링
- 테스트 fixture 생성

금지:
- workspace 밖 파일 접근
- .env*, secret, token 파일 접근/생성/커밋
- .git 삭제
- git push, npm publish, docker login
- 운영 배포 명령
- forbiddenScope 수정

완료 목표:
- bash ./scripts/agent/verify-after-task.sh 통과
- 가능하면 bash ./tests/smoke.sh 통과
- 실패가 task 범위 밖이면 멈추고 이유를 요약

완료 보고:
- 변경 파일
- 실행한 검증 명령
- 성공/실패 결과
- 남은 위험
PROMPT

{
  cat "$LOG_DIR/prompt.md"
  echo
  echo "===== 현재 작업 ====="
  cat "$TASK_PROMPT"
} > "$LOG_DIR/full-prompt.md"

echo "[run-codex] 모드: $MODE"
echo "[run-codex] 로그: $LOG_DIR"

if [ "$MODE" = "safe" ]; then
  codex exec --cd . --yolo - < "$LOG_DIR/full-prompt.md" 2>&1 | tee "$LOG_DIR/codex.log"
elif [ "$MODE" = "yolo" ]; then
  echo "[run-codex:경고] yolo 모드입니다. Dev Container 안의 파일은 자유롭게 변경될 수 있습니다."
  codex exec --cd . --dangerously-bypass-approvals-and-sandbox - < "$LOG_DIR/full-prompt.md" 2>&1 | tee "$LOG_DIR/codex.log"
else
  echo "[run-codex:오류] 알 수 없는 모드: $MODE" >&2
  exit 1
fi

echo "[run-codex] Codex 실행 완료"
