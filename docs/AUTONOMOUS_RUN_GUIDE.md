# Autonomous Run Guide — 채팅 없이 자동으로 진행하기

이 문서는 Codex CLI를 사용해 Dev Container 안에서 작업을 자동 진행하는 방법입니다.

## 0. 전제

```text
- VS Code Dev Container 안에서 실행한다.
- 현재 레포는 disposable하다.
- 중요한 secret은 workspace 안에 없다.
- 초기 커밋 또는 checkpoint가 있다.
- Codex CLI 인증이 되어 있다.
```

확인:

```bash
codex --version
codex doctor || true
bash ./scripts/devcontainer/check-env.sh
```

## 1. 현재 상태 보기

```bash
bash ./scripts/agent/status.sh
```

## 2. 1개 작업 자동 실행

```bash
bash ./scripts/agent/auto-loop.sh --limit 1
```

## 3. 3개 작업 자동 실행

```bash
bash ./scripts/agent/auto-loop.sh --limit 3
```

## 4. 더 공격적인 yolo 모드

```bash
bash ./scripts/agent/auto-loop.sh --limit 3 --mode yolo
```

이 모드는 Dev Container를 외부 sandbox로 보고 Codex 내부 sandbox/approval을 우회합니다. 컨테이너 안 파일은 실제로 수정될 수 있으므로 checkpoint가 필요합니다.

## 5. 자동 루프가 멈췄을 때

```bash
bash ./scripts/agent/status.sh
git status
tail -n 120 .harness/agent-workspace/auto-runs/*/codex.log
```

## 6. 복구

```bash
bash ./scripts/agent/restore-checkpoint.sh
```

## 7. 권장 실행 단위

```text
처음: --limit 1
안정화 후: --limit 3
많이 맡길 때: --limit 5
처음부터 28개 전체 실행은 비추천
```
