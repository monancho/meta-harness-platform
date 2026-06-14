# Meta Harness Platform — 한국어 Instant Dev Container Autopilot Starter v1.4

이 레포는 **Meta Harness / Project Factory Harness**를 실제로 구현하기 위한 한국어 친화형 starter입니다.
기존 버전보다 목표가 명확합니다.

```text
빈 폴더에서 시작
→ Dev Container로 환경 고정
→ Codex가 컨테이너 안에서 작업/테스트 실행
→ 자동 루프가 task를 순서대로 진행
→ 검증 통과 시 커밋/병합/완료 마커 기록
```

## 가장 중요한 전제

이 패키지는 완성된 하네스가 아닙니다. 하지만 **MVP부터 최종형 하네스까지 Codex가 단계적으로 구현할 수 있게 만든 작업장**입니다.

- 작업 큐: `MH-001` ~ `MH-028`
- 기본 실행 환경: Dev Container
- 기본 자동화 모드: `safe`
- 공격적 자동화 모드: `yolo` — 컨테이너를 버릴 수 있다는 전제에서만 사용

## 포트폴리오 랜딩

프로젝트의 문제 정의, 솔루션, 아키텍처, 데모 흐름, 구현 상태는 [docs/PORTFOLIO.md](docs/PORTFOLIO.md)에 정리되어 있습니다.

핵심 포지셔닝은 **완성된 자율 개발자**가 아니라, Target Repo 안에 agentic software factory를 생성하고 실행 산출물을 검증 가능하게 남기는 **repo-resident DevTool skeleton**입니다.


## v1.4 인스턴트 모드

이 버전은 Dev Container가 처음 열릴 때 가능한 초기 설치를 자동으로 시도합니다.

자동으로 처리하는 것:

```text
- apt 기반 기본 도구 설치: git, jq, make, ripgrep, zip 등
- Node 22 기반 환경
- corepack enable
- npm install
- Codex CLI 설치 시도
- Git safe.directory / user.name / user.email / pager 설정
- Git repo 초기화
- 다음 단계 안내 파일 생성
```

사용자는 컨테이너가 열린 뒤 아래만 실행하면 됩니다.

```bash
./GO.sh
```

3개 작업을 연속으로 맡기려면:

```bash
./GO.sh 3 safe
```

강한 모드는:

```bash
./GO.sh 3 yolo
```

Codex CLI 인증이 안 되어 있으면 `./GO.sh`가 멈추고 `codex login`을 안내합니다. 로그인은 사용자 계정이 필요하므로 완전 자동화할 수 없습니다.

## 0. 처음 시작하는 방법

VS Code에서 이 폴더를 엽니다.

```text
meta-harness-platform/
```

그다음:

```text
Command Palette
→ Dev Containers: Reopen in Container
```

컨테이너가 열리면 터미널에서:

```bash
bash ./scripts/agent/autopilot-preflight.sh
```

통과하면 준비 완료입니다.

## 1. 제일 쉬운 진행 방식

### 1개 작업만 자동 진행

```bash
bash ./scripts/agent/auto-loop.sh --limit 1 --mode safe
```

### 3개 작업 연속 진행

```bash
bash ./scripts/agent/auto-loop.sh --limit 3 --mode safe
```

### 컨테이너를 버릴 각오로 더 강하게 진행

```bash
bash ./scripts/agent/auto-loop.sh --limit 3 --mode yolo
```

`yolo`는 Dev Container 안에서만 사용하세요. `.env`, 실제 토큰, 운영 키가 workspace 안에 있으면 안 됩니다.

## 2. 수동/반자동 진행 방식

자동 루프가 부담되면 아래처럼 한 작업씩 진행합니다.

```bash
bash ./scripts/agent/next-task.sh
bash ./scripts/agent/run-codex-current-task.sh --mode safe
bash ./scripts/agent/finish-task.sh
```

상태 확인:

```bash
bash ./scripts/agent/status.sh
```

## 3. 복구 방법

자동 실행 전에는 checkpoint가 생성됩니다.

수동 생성:

```bash
bash ./scripts/agent/create-checkpoint.sh
```

망가졌을 때 복구:

```bash
bash ./scripts/agent/restore-checkpoint.sh
```

또는 특정 태그로 복구:

```bash
bash ./scripts/agent/restore-checkpoint.sh checkpoint-before-auto-YYYYMMDD-HHMMSS
```

## 4. 왜 Dev Container인가

Dev Container는 Windows/로컬 전역 환경을 직접 건드리지 않고, Node/Bash/Git/Make 환경을 컨테이너 안에 고정합니다.

그래도 주의할 점은 있습니다.

```text
Dev Container 안의 /workspaces/meta-harness-platform 은 보통 호스트 폴더와 연결됩니다.
즉, 컨테이너 안에서 프로젝트 파일을 지우면 호스트 폴더에도 반영될 수 있습니다.
```

그래서 이 starter는 항상 Git checkpoint와 task별 commit을 사용합니다.

## 5. Codex CLI가 없으면

컨테이너 안에서:

```bash
npm install -g @openai/codex
codex --version
```

로그인이 필요하면 Codex CLI 안내에 따라 인증하세요. VS Code 확장 로그인과 CLI 로그인이 다를 수 있습니다.

## 6. 작업 큐

| 구간 | 작업 | 목표 |
|---|---|---|
| M0 | MH-001 ~ MH-004 | 코드베이스 구조, 스키마, 상태 머신, manifest |
| M1 | MH-005 ~ MH-010 | L0 runner, task compiler, security policy, adapter, Codex, PR loop |
| M2 | MH-011 ~ MH-014 | Dashboard, artifact viewer, patch viewer, security gate |
| M3 | MH-015 ~ MH-019 | upgrade engine, managed block, GitHub Actions, container/kind profile |
| M4 | MH-020 ~ MH-025 | eval, sanitized feedback, productization, release, maintenance |
| M5 | MH-026 ~ MH-028 | E2E demo, portfolio landing, demo video/README polish |

## 7. 핵심 명령어

```bash
bash ./scripts/agent/status.sh
bash ./scripts/agent/next-task.sh
bash ./scripts/agent/run-codex-current-task.sh --mode safe
bash ./scripts/agent/finish-task.sh
bash ./scripts/agent/auto-loop.sh --limit 3 --mode safe
bash ./scripts/agent/auto-loop.sh --limit 3 --mode yolo
bash ./scripts/agent/restore-checkpoint.sh
```

## 8. 현재 starter가 이미 검증하는 것

```bash
node ./bin/mh.mjs doctor
bash ./tests/smoke.sh
node ./scripts/agent/validate-agent-ready.mjs
```

smoke test는 다음 흐름을 검증합니다.

```text
planning scaffold
→ planning synthesize
→ acceptance compile
→ planning freeze
→ factory bootstrap
→ factory upgrade --dry-run
→ shell adapter run
→ patch.diff / run-result.json / summary.md 생성
```

Upgrade dry-run은 Target Repo의 `.harness/manifest.lock`을 기준으로 managed file의 baseline checksum, 현재 target checksum, 현재 factory template checksum을 비교합니다. 결과는 target 파일을 수정하지 않고 `.harness/upgrades/upgrade-report.json`과 `.harness/upgrades/upgrade-summary.md`에 기록됩니다.

## 9. 최종 산출물

이 작업 큐가 끝나면 하나의 앱이 아니라, 아래를 갖춘 개인용 AI 개발 자동화 도구 세트가 됩니다.

```text
Meta Harness CLI
Target Project Factory Generator
Agent Workcell Runner
Codex Adapter
Security Gate
Upgrade Engine
Eval / Feedback Loop
React Dashboard
Portfolio Demo
```
