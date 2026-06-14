# Meta Harness Platform

Meta Harness Platform은 AI-assisted software delivery를 위한 repo-resident 프로젝트 공장입니다. Target Project Repo 안에 들어갈 개발 공장을 생성하고 검증합니다. 그 공장은 planning contract, task packet, scoped runner, security gate, run artifact, dashboard fixture, maintenance report를 포함합니다.

핵심 소유권 원칙은 다음과 같습니다.

```text
Meta Harness Platform은 template, generator, schema, policy, eval, sanitized improvement signal을 소유한다.
Target Project Repo는 planning docs, application code, infrastructure, run logs, artifacts를 소유한다.
```

## 이 레포가 제공하는 것

- `bin/mh.mjs`와 `packages/core` 기반의 `mh` CLI lifecycle 명령
- planning-first Target Project Factory bootstrap
- editable scope, forbidden scope, verification command, budget, expected artifact를 가진 task packet contract
- non-git demo fallback을 포함한 L0 local git worktree runner
- agent adapter, execution profile, GitHub PR loop, container, kind, eval, release, maintenance skeleton
- `apps/dashboard/preview.mjs`로 실행되는 dependency-free dashboard preview
- 외부 서비스 없이 실행 가능한 smoke/demo script

## 빠른 시작

Node 20 이상을 사용합니다. 이 저장소는 포함된 Dev Container에서 동작하도록 설계되어 있지만, 핵심 script는 일반 Node와 Bash로 실행됩니다.

```bash
npm run doctor
npm run verify
npm run smoke
```

Dashboard preview 실행:

```bash
npm run dashboard:preview
```

브라우저에서 `http://localhost:4173`을 엽니다. preview server는 `apps/dashboard/preview.mjs`이며, `apps/dashboard/**`만 serve하고 `apps/dashboard/fixtures`의 sanitized fixture를 읽습니다.

오프라인 end-to-end demo 실행:

```bash
npm run demo:e2e
```

이 demo는 임시 출력 디렉터리에 generated Target Project를 만들고, planning docs, factory bootstrap output, task packet shape, run artifacts를 검증합니다.

## 주요 명령

아래 명령은 root `package.json`에 정의되어 있습니다.

| Command | Purpose |
|---|---|
| `npm run doctor` | local Node/Git/Make 환경 확인 |
| `npm run verify` | agent-ready validation, syntax check, smoke test 실행 |
| `npm run smoke` | 전체 smoke suite 실행 |
| `npm run dashboard:preview` | local dependency-free dashboard preview server 시작 |
| `npm run demo:e2e` | 오프라인 end-to-end demo 실행 |
| `npm run agent:status` | MH-001부터 MH-028까지의 task completion 상태 확인 |

## 문서 지도

사용자 가이드:

- [시작하기](docs/user-guide/getting-started.md)
- [Target Project 생성](docs/user-guide/target-project.md)
- [Agent Task 실행](docs/user-guide/agent-task-run.md)
- [Dashboard Preview](docs/user-guide/dashboard-preview.md)
- [Troubleshooting](docs/user-guide/troubleshooting.md)

개발자 가이드:

- [Architecture](docs/developer-guide/architecture.md)
- [Agent Adapter](docs/developer-guide/agent-adapter.md)
- [Execution Profile](docs/developer-guide/execution-profile.md)
- [Security Policy](docs/developer-guide/security-policy.md)
- [Testing](docs/developer-guide/testing.md)

개발 히스토리와 release note:

- [MH-001부터 MH-028까지 요약](docs/development-history/mh-001-to-mh-028-summary.md)
- [주요 설계 결정](docs/development-history/design-decisions.md)
- [Release Cleanup Notes](docs/development-history/release-cleanup-notes.md)

포트폴리오 자료:

- [Case Study 초안](docs/portfolio/case-study.md)
- [Demo Script 초안](docs/portfolio/demo-script.md)
- [Portfolio Summary 초안](docs/portfolio/portfolio-summary.md)

기존 상세 참고 문서도 `docs/` 아래에 유지됩니다. [Dashboard](docs/DASHBOARD.md), [End-to-End Demo](docs/E2E_DEMO.md), [Test Spec](docs/TEST_SPEC.md), [Portfolio](docs/PORTFOLIO.md), [Architecture Diagrams](docs/architecture/DIAGRAMS.md)를 참고하세요.

## 운영 규칙

- release cleanup 또는 hardening 작업은 `main`에서 직접 하지 않습니다.
- 사용자 명시 요청 없이 push, publish, deploy, merge하지 않습니다.
- `.env*`, secret, key, runtime log, run artifact를 커밋하지 않습니다.
- Target Repo의 raw project data를 Meta에 저장하지 않습니다.
- cleanup notes, operations guidance, docs, verification report처럼 작은 단위로 커밋합니다.

전체 유지보수 지침은 [AGENTS.md](AGENTS.md)를 따릅니다.
