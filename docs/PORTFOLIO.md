# Meta Harness Platform Portfolio Landing Page

Meta Harness Platform is a repo-resident agentic software factory skeleton. It is not a finished autonomous developer. Its purpose is to turn approved planning artifacts into a Target Repo-local development factory with task packets, execution profiles, policy gates, run artifacts, and portfolio-grade demos.

## Positioning

**Problem:** AI coding agents can produce code quickly, but real projects need durable planning contracts, scoped write permissions, reproducible execution, security boundaries, and reviewable artifacts.

**Solution:** Meta Harness builds the factory that lives inside a Target Project Repo. The Target Repo owns planning docs, code, infrastructure, run logs, and artifacts. Meta owns reusable templates, generators, schemas, policies, evals, and sanitized improvement signals.

**Current status:** This repository is an MVP-to-full-harness implementation workspace. It demonstrates the main lifecycle locally, but it should not be described as production-ready until the quality gates and release gates prove that claim.

## Demo Flow

The shortest portfolio demo is the offline E2E flow from an empty output directory to generated planning docs, a frozen factory, and shell-run artifacts.

```bash
bash ./examples/e2e-demo/run-demo.sh
```

Optional output directory:

```bash
bash ./examples/e2e-demo/run-demo.sh /tmp/mh-e2e-review
```

Useful review commands:

```bash
node ./bin/mh.mjs doctor
bash ./tests/smoke.sh
npm run dashboard:preview
```

Dashboard preview opens at `http://localhost:4173` and serves only `apps/dashboard/**` fixtures.

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

The most important boundary is ownership: Meta can generate a factory, but project source data and execution artifacts remain Target Repo-owned.

## Diagrams And Screenshots

Architecture diagrams are stored in [docs/architecture/diagrams](architecture/diagrams). Recommended portfolio views:

- [Overall architecture](architecture/diagrams/전체_아키텍처_개요_다이어그램.png)
- [Lifecycle flow](architecture/diagrams/전체_생애주기_흐름도.png)
- [Target Repo ownership model](architecture/diagrams/타겟_프로젝트_리포_구조_다이어그램.png)
- [Factory state machine](architecture/diagrams/프로젝트_공장의_상태와_전이_규칙.png)
- [Task contract pipeline](architecture/diagrams/작업_계약_파이프라인_흐름도.png)
- [Security boundary](architecture/diagrams/보안_경계와_소유권_분리_안내.png)

Dashboard screenshots can be captured from the local preview after running:

```bash
npm run dashboard:preview
```

The dashboard currently focuses on sanitized fixtures for run history, artifacts, patch diffs, manifest state, and task packet policy review.

## Implementation Highlights

- CLI skeleton and smoke-tested lifecycle commands in `bin/mh.mjs`.
- Planning-first flow: scaffold, synthesize, compile acceptance criteria, freeze, then bootstrap.
- Task packet contract with editable scope, forbidden scope, verification commands, budgets, and expected artifacts.
- L0 local worktree runner path and shell adapter artifact generation.
- Agent adapter layer with Codex adapter path.
- Security policy checks for forbidden writes and command boundaries.
- GitHub PR loop skeleton and execution profile skeletons for local, CI, container, and kind paths.
- Upgrade dry-run and managed-block update strategy.
- Dashboard views for runs, artifacts, patch diffs, and policy warnings.
- Eval registry, sanitized feedback exporter, productization audit, release, and maintenance harness skeletons.
- Offline E2E demo fixture under `examples/e2e-demo`.

## Implemented, Planned, Out Of Scope

| Area | Status | Notes |
|---|---|---|
| Planning scaffold and freeze | Implemented skeleton | Demonstrated in smoke and E2E flows. |
| Factory bootstrap | Implemented skeleton | Creates Target Repo-local harness contracts after planning is frozen. |
| L0 local worktree execution | Implemented skeleton | Worktree-first profile remains the default path. |
| Shell/Codex adapter paths | Implemented skeleton | Shell path is suitable for deterministic local smoke tests. |
| Dashboard | Implemented static MVP | Fixture-backed preview for run, artifact, and patch inspection. |
| GitHub PR loop | Planned skeleton | Not a production GitHub App or full Checks API integration. |
| Container/kind execution | Planned skeleton | Kept behind L0 maturity; not the default runner. |
| Release and maintenance workflows | Planned skeleton | Useful for portfolio explanation, not proof of production readiness. |
| Raw project data learning | Intentionally out of scope | Meta stores sanitized signals only, never raw PRDs, raw code, logs, or secrets. |
| Fully autonomous development | Intentionally out of scope | The system provides contracts and guardrails for agents; it is not presented as a complete autonomous developer. |

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

This project is strongest as a DevTool systems portfolio piece: it shows how to structure agent work as contracts, how to keep generated code and project-owned code separate, how to gate unsafe changes, and how to leave artifacts a reviewer can inspect. The realistic claim is an MVP skeleton with deterministic local demos and clear extension points, not a production autonomous engineering platform.
