# 채팅 없이 진행하는 가이드

이 버전은 VS Code 채팅에 매번 붙여넣지 않고, Codex CLI를 통해 자동 진행할 수 있게 구성되어 있습니다.

## 1. Dev Container 열기

VS Code에서:

```text
Dev Containers: Reopen in Container
```

## 2. 사전 점검

```bash
bash ./scripts/agent/autopilot-preflight.sh
```

## 3. 자동 실행

한 작업만:

```bash
bash ./scripts/agent/auto-loop.sh --limit 1 --mode safe
```

세 작업:

```bash
bash ./scripts/agent/auto-loop.sh --limit 3 --mode safe
```

## 4. 강한 모드

```bash
bash ./scripts/agent/auto-loop.sh --limit 3 --mode yolo
```

`yolo`는 Dev Container와 현재 레포를 버릴 수 있다는 전제에서만 사용합니다.

## 5. 상태 확인

```bash
bash ./scripts/agent/status.sh
```

## 6. 복구

```bash
bash ./scripts/agent/restore-checkpoint.sh
```
