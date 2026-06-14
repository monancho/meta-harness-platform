# Codex 실행 모드

## safe 모드

```bash
bash ./scripts/agent/run-codex-current-task.sh --mode safe
```

특징:

```text
workspace-write
approval never
workspace 내부 수정 중심
```

권장 기본값입니다.

## yolo 모드

```bash
bash ./scripts/agent/run-codex-current-task.sh --mode yolo
```

특징:

```text
Codex sandbox/approval 우회
Dev Container 안에서 강한 권한
```

주의:

```text
Windows 전체를 직접 망가뜨릴 가능성은 낮지만,
현재 workspace 파일은 실제로 수정/삭제될 수 있습니다.
```

따라서 yolo 전에는 반드시 checkpoint를 만드세요.

```bash
bash ./scripts/agent/create-checkpoint.sh
```
