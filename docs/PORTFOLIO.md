# Meta Harness Platform Portfolio Landing Page

Meta Harness Platform은 repo-resident agentic software factory skeleton입니다. 완성된 autonomous developer가 아닙니다. 목적은 승인된 planning artifact를 Target Repo-local development factory로 바꾸는 것입니다. 이 factory는 task packet, execution profile, policy gate, run artifact, portfolio-grade demo를 포함합니다.

## Positioning

**Problem:** AI coding agent는 code를 빠르게 만들 수 있지만, 실제 프로젝트에는 durable planning contract, scoped write permission, reproducible execution, security boundary, reviewable artifact가 필요합니다.

**Solution:** Meta Harness는 Target Project Repo 안에 존재하는 factory를 만듭니다. Target Repo는 planning docs, code, infrastructure, run logs, artifacts를 소유합니다. Meta는 reusable template, generator, schema, policy, eval, sanitized improvement signal을 소유합니다.

**Current status:** 이 repository는 MVP-to-full-harness implementation workspace입니다. local에서 main lifecycle을 보여주지만, quality gate와 release gate가 그 수준을 입증하기 전까지 production-ready라고 설명하면 안 됩니다.

## Demo Flow

가장 짧은 portfolio demo는 empty output directory에서 generated planning docs, frozen factory, shell-run artifacts까지 가는 offline E2E flow입니다.

```bash
bash ./examples/e2e-demo/run-demo.sh
```

선택 output directory:

```bash
bash ./examples/e2e-demo/run-demo.sh /tmp/mh-e2e-review
```

review에 유용한 명령:

```bash
node ./bin/mh.mjs doctor
bash ./tests/smoke.sh
npm run dashboard:preview
```

Dashboard preview는 `http://localhost:4173`에서 열리며 `apps/dashboard/**` fixture만 serve합니다.

## Architecture At A Glance

```text
Meta Harness Platform
  -> planning scaffold and synthesis templates
  -> acceptance and task packet compiler
  -> factory bootstrap and managed-file manifest
  -> execution profiles and agent adapters
  -> policy gates and artifact contracts
  -> dashboard, eval, feedback, release, and maintenance skeletons

Target Project Repo
  -> owns docs/planning, apps, packages, infra, run artifacts, and PR output
```

가장 중요한 boundary는 ownership입니다. Meta는 factory를 생성할 수 있지만, project source data와 execution artifact는 Target Repo 소유로 남습니다.

## Diagram과 Screenshot

Architecture diagram은 [docs/architecture/diagrams](architecture/diagrams)에 있습니다. portfolio에 추천하는 view:

- [Overall architecture](architecture/diagrams/전체_아키텍처_개요_다이어그램.png)
- [Lifecycle flow](architecture/diagrams/전체_생애주기_흐름도.png)
- [Target Repo ownership model](architecture/diagrams/타겟_프로젝트_리포_구조_다이어그램.png)
- [Factory state machine](architecture/diagrams/프로젝트_공장의_상태와_전이_규칙.png)
- [Task contract pipeline](architecture/diagrams/작업_계약_파이프라인_흐름도.png)
- [Security boundary](architecture/diagrams/보안_경계와_소유권_분리_안내.png)

Dashboard screenshot은 아래 명령 실행 후 local preview에서 캡처할 수 있습니다.

```bash
npm run dashboard:preview
```

현재 dashboard는 run history, artifacts, patch diffs, manifest state, task packet policy review를 위한 sanitized fixture에 집중합니다.

## Implementation Highlights

- `bin/mh.mjs`의 CLI skeleton과 smoke-tested lifecycle command
- Planning-first flow: scaffold, synthesize, compile acceptance criteria, freeze, bootstrap
- editable scope, forbidden scope, verification command, budget, expected artifact를 가진 task packet contract
- L0 local worktree runner path와 shell adapter artifact generation
- Codex adapter path를 포함한 agent adapter layer
- forbidden write와 command boundary를 위한 security policy check
- GitHub PR loop skeleton과 local/CI/container/kind execution profile skeleton
- upgrade dry-run과 managed-block update strategy
- run, artifact, patch diff, policy warning dashboard view
- eval registry, sanitized feedback exporter, productization audit, release, maintenance harness skeleton
- `examples/e2e-demo` 아래 offline E2E demo fixture

## Implemented, Planned, Out Of Scope

| Area | Status | Notes |
|---|---|---|
| Planning scaffold and freeze | Implemented skeleton | smoke와 E2E flow에서 검증됩니다. |
| Factory bootstrap | Implemented skeleton | planning freeze 이후 Target Repo-local harness contract를 생성합니다. |
| L0 local worktree execution | Implemented skeleton | worktree-first profile이 기본 path입니다. |
| Shell/Codex adapter paths | Implemented skeleton | Shell path는 deterministic local smoke test에 적합합니다. |
| Dashboard | Implemented static MVP | run, artifact, patch inspection을 위한 fixture-backed preview입니다. |
| GitHub PR loop | Planned skeleton | production GitHub App이나 full Checks API integration이 아닙니다. |
| Container/kind execution | Planned skeleton | L0 maturity 뒤에 둔 profile이며 default runner가 아닙니다. |
| Release and maintenance workflows | Planned skeleton | portfolio 설명에는 유용하지만 production readiness 증거는 아닙니다. |
| Raw project data learning | Intentionally out of scope | Meta는 sanitized signal만 저장하며 raw PRD, raw code, log, secret은 저장하지 않습니다. |
| Fully autonomous development | Intentionally out of scope | 이 system은 agent를 위한 contract와 guardrail을 제공하며 complete autonomous developer로 제시하지 않습니다. |

## Source Links

- [Technical PRD/spec PDF](spec/meta_harness_project_factory_v1_2_PRD_tech_test_spec.pdf)
- [Technical PRD/spec Markdown](spec/meta_harness_project_factory_v1_2_PRD_tech_test_spec_full.md)
- [Architecture diagram catalog](architecture/DIAGRAMS.md)
- [Task backlog](../.harness/agent-workspace/backlog.yml)
- [Agent task index](AGENT_TASK_INDEX.md)
- [E2E demo guide](E2E_DEMO.md)
- [Dashboard guide](DASHBOARD.md)
- [Generated target project demo](../examples/generated-target-project-demo/README.md)

## Review Narrative

이 프로젝트는 DevTool systems portfolio piece로 가장 강합니다. agent work를 contract로 구조화하는 방법, generated code와 project-owned code를 분리하는 방법, unsafe change를 gate하는 방법, reviewer가 inspection할 artifact를 남기는 방법을 보여줍니다. 현실적인 claim은 deterministic local demo와 clear extension point를 가진 MVP skeleton이지 production autonomous engineering platform이 아닙니다.
