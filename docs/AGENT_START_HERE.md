# 에이전트 시작 지점

이 문서는 Codex/Claude/기타 에이전트가 가장 먼저 봐야 하는 안내입니다.

## 현재 목표

Meta Harness Platform을 구현합니다.

최종 목표:

```text
빈 Target Repo
→ planning scaffold
→ planning freeze
→ factory bootstrap
→ task packet
→ workcell 실행
→ patch/report/PR
→ dashboard/eval/feedback/upgrade loop
```

## 자동화 루틴

가장 쉬운 루틴:

```bash
bash ./scripts/agent/auto-loop.sh --limit 1 --mode safe
```

여러 작업:

```bash
bash ./scripts/agent/auto-loop.sh --limit 3 --mode safe
```

강한 권한:

```bash
bash ./scripts/agent/auto-loop.sh --limit 3 --mode yolo
```

## 수동 루틴

```bash
bash ./scripts/agent/next-task.sh
bash ./scripts/agent/run-codex-current-task.sh --mode safe
bash ./scripts/agent/finish-task.sh
```

## 주의

- `current-task.md`는 현재 작업 요약입니다.
- 원본 작업 정의는 `.harness/agent-workspace/tasks/MH-XXX-*.task.json`입니다.
- `AGENTS.md`가 전체 규칙입니다.
