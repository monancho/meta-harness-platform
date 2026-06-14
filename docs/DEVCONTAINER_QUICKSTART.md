# Dev Container 빠른 시작

## 왜 Dev Container인가

Windows/PowerShell/Git Bash/WSL 차이를 없애고, Codex가 같은 환경에서 테스트를 돌리게 하기 위해서입니다.

## 시작

```text
VS Code → Dev Containers: Reopen in Container
```

## 확인

```bash
bash ./scripts/devcontainer/check-env.sh
bash ./scripts/agent/autopilot-preflight.sh
```

## 자동 실행

```bash
bash ./scripts/agent/auto-loop.sh --limit 1 --mode safe
```

## Docker가 필요한 작업

기본 devcontainer는 Docker socket을 열지 않습니다. Windows를 더 안전하게 두기 위해서입니다.
나중에 container/kind 작업이 필요하면 `.devcontainer/devcontainer.with-docker.json`를 참고하세요.
