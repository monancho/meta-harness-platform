#!/usr/bin/env bash
set -euo pipefail

TASK="${1:-}"
if [ -z "$TASK" ]; then
  echo "사용법: bash ./scripts/agent/task-cycle.sh MH-001" >&2
  exit 1
fi

TASK_FILE="$(ls .harness/agent-workspace/tasks/${TASK}-*.task.json 2>/dev/null | head -n 1 || true)"
if [ -z "$TASK_FILE" ]; then
  echo "[오류] task packet을 찾지 못했습니다: ${TASK}" >&2
  echo "사용 가능한 task:" >&2
  ls .harness/agent-workspace/tasks/*.task.json | sed 's#^#- #' >&2
  exit 1
fi

BRANCH="feat/${TASK}"

# Dev Container 전용 Git 기본값
WORKSPACE="$(pwd)"
git config --global --add safe.directory "$WORKSPACE" >/dev/null 2>&1 || true
git config --global init.defaultBranch main >/dev/null 2>&1 || true
git config --global core.pager cat >/dev/null 2>&1 || true
if ! git config --global user.name >/dev/null 2>&1; then
  git config --global user.name "Meta Harness Dev" >/dev/null 2>&1 || true
fi
if ! git config --global user.email >/dev/null 2>&1; then
  git config --global user.email "meta-harness-dev@example.local" >/dev/null 2>&1 || true
fi

echo "[task-cycle] 작업: ${TASK}"
echo "[task-cycle] 브랜치: ${BRANCH}"

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if [ -n "$(git status --porcelain)" ]; then
    echo "[경고] 아직 커밋되지 않은 변경사항이 있습니다. 자동 루프에서는 next-task.sh가 이를 차단합니다."
    git status --short
  fi
  if ! git rev-parse --verify "${BRANCH}" >/dev/null 2>&1; then
    git switch -c "${BRANCH}" || git checkout -b "${BRANCH}"
  else
    git switch "${BRANCH}" || git checkout "${BRANCH}"
  fi
else
  echo "[정보] Git repo가 아닙니다. 초기화합니다."
  git init
  git add .
  git commit -m "chore: initialize meta harness starter" || true
  git switch -c "${BRANCH}" || git checkout -b "${BRANCH}"
fi

mkdir -p .harness/agent-workspace

TITLE="$(jq -r '.koTitle // .title // .taskId' "$TASK_FILE")"
OBJECTIVE="$(jq -r '.koObjective // .objective // ""' "$TASK_FILE")"
ORIG_TITLE="$(jq -r '.title // ""' "$TASK_FILE")"
PRIORITY="$(jq -r '.priority // ""' "$TASK_FILE")"
TYPE="$(jq -r '.taskType // ""' "$TASK_FILE")"

{
  echo "# 현재 작업: ${TASK}"
  echo
  echo "## 한 줄 요약"
  echo "${TITLE}"
  echo
  echo "## 목적"
  echo "${OBJECTIVE}"
  echo
  echo "## 원문 제목"
  echo "${ORIG_TITLE}"
  echo
  echo "## 작업 정보"
  echo "- Task ID: ${TASK}"
  echo "- Priority: ${PRIORITY}"
  echo "- Type: ${TYPE}"
  echo "- 원본 task packet: ${TASK_FILE}"
  echo
  echo "## Codex가 반드시 먼저 읽을 파일"
  echo "1. AGENTS.md"
  echo "2. .harness/agent-workspace/current-task.md"
  echo "3. ${TASK_FILE}"
  echo "4. .harness/agent-workspace/policies/editable-scope.yml"
  echo "5. .harness/agent-workspace/policies/forbidden-scope.yml"
  echo "6. .harness/agent-workspace/quality-gates.yml"
  echo
  echo "## 수정 가능 범위"
  jq -r '.editableScope[]? // empty | "- " + .' "$TASK_FILE"
  echo
  echo "## 수정 금지 범위"
  jq -r '.forbiddenScope[]? // empty | "- " + .' "$TASK_FILE"
  echo
  echo "## 완료 기준 / Acceptance Criteria"
  jq -r '.acceptanceCriteria[]? | "- [ ] " + (.id // "AC") + ": " + (.text // "")' "$TASK_FILE"
  echo
  echo "## 검증 명령"
  echo "- bash ./scripts/agent/verify-after-task.sh"
  echo "- bash ./tests/smoke.sh"
  echo
  echo "## Codex에게 줄 기본 지시문"
  echo "AGENTS.md와 .harness/agent-workspace/current-task.md를 기준으로 현재 작업을 구현해줘. Dev Container 안에서 작업하고, 수정 가능 범위만 변경하며, forbiddenScope는 절대 건드리지 마. 구현 후 bash ./scripts/agent/verify-after-task.sh 가 통과하도록 수정해줘."
  echo
  echo "---"
  echo
  echo "## 원본 task packet 전체"
  cat "$TASK_FILE"
} > .harness/agent-workspace/current-task.md
echo "[완료] 현재 작업 파일 생성: .harness/agent-workspace/current-task.md"
echo
echo "다음 선택지:"
echo "1) Codex CLI 자동 실행: bash ./scripts/agent/run-codex-current-task.sh"
echo "2) VS Code Codex 채팅: current-task.md 기준으로 작업 요청"
echo "3) 수동 구현: AGENTS.md + current-task.md 읽고 직접 수정"
echo
echo "구현 후: bash ./scripts/agent/finish-task.sh"
