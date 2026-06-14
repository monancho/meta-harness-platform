# Meta Harness Platform

Meta Harness Platform is a repo-resident agentic software factory starter. It does not try to be a finished autonomous developer. It builds the repeatable factory that a Target Project Repo can own: planning contracts, task packets, scoped execution, security gates, run artifacts, upgrade reports, and review surfaces.

The core idea is simple:

```text
Meta Harness Platform creates and upgrades the factory.
Target Project Repo owns the project plan, code, infra, logs, and artifacts.
```

## Recruiter-Friendly Summary

This project demonstrates systems thinking for AI-assisted software delivery. It turns agent work into auditable contracts instead of one-off chat sessions: a task has editable scope, forbidden scope, verification commands, budgets, expected artifacts, and a deterministic local run path.

It is strongest as a DevTool portfolio piece. It shows product architecture, CLI workflows, policy enforcement, local execution, generated project scaffolding, dashboard fixtures, eval skeletons, and a concise demo path that can run offline inside a Dev Container.

## Quick Start

Open this repository in VS Code and reopen it in the Dev Container:

```text
Command Palette -> Dev Containers: Reopen in Container
```

Run the main verification:

```bash
bash ./scripts/agent/verify-after-task.sh
```

Run the end-to-end demo:

```bash
bash ./examples/e2e-demo/run-demo.sh
```

Keep a named demo output directory:

```bash
bash ./examples/e2e-demo/run-demo.sh /tmp/mh-e2e-review
```

Preview the dashboard fixtures:

```bash
npm run dashboard:preview
```

The dashboard preview serves local fixtures and opens at `http://localhost:4173`.

## Demo Narrative

For a 3-5 minute walkthrough, use [docs/DEMO_VIDEO_SCRIPT.md](docs/DEMO_VIDEO_SCRIPT.md). The short version is:

```bash
node ./bin/mh.mjs doctor
bash ./examples/e2e-demo/run-demo.sh /tmp/mh-e2e-review
bash ./tests/smoke.sh
npm run dashboard:preview
```

The demo proves the MVP lifecycle from an empty output folder to generated planning docs, a frozen factory, a Target Repo-local harness, and shell-run artifacts.

## Architecture Summary

```text
Meta Harness Platform
  -> templates, generators, schemas, policies, evals
  -> planning scaffold and synthesis
  -> task packet compiler
  -> factory bootstrap and manifest ownership
  -> execution profiles and agent adapters
  -> policy gates and artifact contracts
  -> dashboard, release, maintenance, and feedback skeletons

Target Project Repo
  -> docs/planning/**
  -> .harness/planning/**
  -> apps/**, packages/**, infra/**
  -> run artifacts and review output
```

The most important rule is ownership separation. Meta may generate Target Repo files, but it must not keep raw PRDs, raw code, raw logs, secrets, or project-specific business documents. Meta can keep sanitized failure categories, reason codes, runtime buckets, retry counts, generator versions, and template improvement signals.

## Implementation Status

| Area | Status | Notes |
|---|---|---|
| CLI lifecycle | MVP skeleton | `bin/mh.mjs` supports doctor, planning, factory, run, eval, signal, audit, release, and maintenance flows. |
| Planning-first gate | Implemented skeleton | Factory bootstrap is blocked until planning is frozen. |
| Task packet contract | Implemented skeleton | Packets include scope, commands, budgets, acceptance criteria, and artifacts. |
| L0 local runner | Implemented skeleton | Worktree-first execution is the default direction; shell adapter is the deterministic smoke path. |
| Codex adapter | Skeleton | Captures the adapter contract and missing-binary failure path. |
| Security policy | Implemented MVP checks | Forbidden scope and denied command cases are covered in smoke tests. |
| Upgrade engine | Dry-run skeleton | Reports managed-file changes without mutating Target files. |
| Dashboard | Static MVP | Fixture-backed views for runs, artifacts, patches, manifest state, and task policy review. |
| Eval and feedback | Skeleton | Stores sanitized signals only; raw project data remains out of scope. |
| Release and maintenance | Skeleton | Provides checklists and report shape, not production release automation. |
| E2E demo | Implemented fixture | `examples/e2e-demo/run-demo.sh` runs offline. |

## Developer Implementation Guide

Start with the repository contract:

```bash
sed -n '1,220p' AGENTS.md
sed -n '1,220p' .harness/agent-workspace/current-task.md
sed -n '1,220p' .harness/agent-workspace/quality-gates.yml
```

Run a single current task manually:

```bash
bash ./scripts/agent/next-task.sh
bash ./scripts/agent/run-codex-current-task.sh --mode safe
bash ./scripts/agent/finish-task.sh
```

Run the task loop in safe mode:

```bash
bash ./scripts/agent/auto-loop.sh --limit 1 --mode safe
```

Inspect project status:

```bash
bash ./scripts/agent/status.sh
```

The implementation flow is intentionally worktree-first:

```text
1. Shell adapter
2. Real local git worktree runner
3. Codex adapter
4. GitHub PR loop
5. Container worker
6. kind namespace runner
```

Kubernetes and remote execution profiles are not the base path. They remain opt-in extensions after L0 local execution is stable.

## Roadmap

| Phase | Focus | Outcome |
|---|---|---|
| Starter | Agent-ready repo and task queue | Humans and agents can understand the work order. |
| MVP | Planning, task packets, local runner, policy gates | A Target Repo can run scoped local factory tasks with artifacts. |
| Beta | Dashboard, PR loop, stronger security, upgrade strategy | Reviewers can inspect runs and managed changes before merge. |
| Full harness | Evals, sanitized feedback, release and maintenance workflows, optional remote profiles | Teams can operate repeatable AI-assisted delivery loops with governance. |

See [docs/AGENT_TASK_INDEX.md](docs/AGENT_TASK_INDEX.md) and [.harness/agent-workspace/backlog.yml](.harness/agent-workspace/backlog.yml) for the MH-001 through MH-028 task map.

## Realistic Limitations

| Level | What it means here | What it is not yet |
|---|---|---|
| Starter | A structured workspace with Korean/English agent instructions, task packets, and verification scripts. | Not a complete product or autonomous engineer. |
| MVP | A local, deterministic project-factory skeleton with planning-first flow and smoke-tested artifacts. | Not production-grade orchestration or a replacement for review. |
| Beta | The intended next maturity level: stronger PR review loop, dashboard usage, security gates, and upgrade workflows. | Not proven multi-tenant infrastructure or enterprise governance. |
| Full harness | The long-term target: governed execution profiles, eval feedback, release and maintenance loops, and repeatable upgrades. | Not a license to store raw project data in Meta or bypass Target Repo ownership. |

## Key Commands

```bash
node ./bin/mh.mjs doctor
bash ./scripts/agent/verify-after-task.sh
bash ./tests/smoke.sh
bash ./examples/e2e-demo/run-demo.sh
npm run dashboard:preview
bash ./scripts/agent/status.sh
bash ./scripts/agent/auto-loop.sh --limit 1 --mode safe
```

## Project References

- [Portfolio page](docs/PORTFOLIO.md)
- [Demo video script](docs/DEMO_VIDEO_SCRIPT.md)
- [End-to-end demo guide](docs/E2E_DEMO.md)
- [Dashboard guide](docs/DASHBOARD.md)
- [Architecture diagrams](docs/architecture/DIAGRAMS.md)
- [Agent task index](docs/AGENT_TASK_INDEX.md)
- [Full harness backlog](docs/FULL_HARNESS_BACKLOG.md)
- [Technical PRD/spec Markdown](docs/spec/meta_harness_project_factory_v1_2_PRD_tech_test_spec_full.md)

