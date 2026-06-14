# Meta Harness Platform

Meta Harness Platform is a repo-resident project factory for AI-assisted software delivery. It creates and verifies the factory that lives inside a Target Project Repo: planning contracts, task packets, scoped runners, security gates, run artifacts, dashboard fixtures, and maintenance reports.

The ownership rule is the core of the project:

```text
Meta Harness Platform owns templates, generators, schemas, policies, evals, and sanitized improvement signals.
Target Project Repo owns planning docs, application code, infrastructure, run logs, and artifacts.
```

## What This Repo Provides

- `mh` CLI lifecycle commands under `bin/mh.mjs` and `packages/core`.
- Planning-first Target Project Factory bootstrap.
- Task packet contracts with editable scope, forbidden scope, verification commands, budgets, and expected artifacts.
- L0 local git worktree runner with fallback behavior for non-git demos.
- Agent adapter, execution profile, GitHub PR loop, container, kind, eval, release, and maintenance skeletons.
- Dependency-free dashboard preview served by `apps/dashboard/preview.mjs`.
- Smoke and demo scripts that run without relying on external services.

## Quick Start

Use Node 20 or newer. The repository is designed to work inside the included Dev Container, but the core scripts are plain Node and Bash.

```bash
npm run doctor
npm run verify
npm run smoke
```

Run the dashboard preview:

```bash
npm run dashboard:preview
```

Then open `http://localhost:4173`. The preview server is `apps/dashboard/preview.mjs`; it serves only `apps/dashboard/**` and reads sanitized fixtures from `apps/dashboard/fixtures`.

Run the offline end-to-end demo:

```bash
npm run demo:e2e
```

The demo creates a generated Target Project in a temporary output directory and validates planning docs, factory bootstrap output, task packet shape, and run artifacts.

## Main Commands

These commands are defined in the root `package.json`.

| Command | Purpose |
|---|---|
| `npm run doctor` | Check local Node/Git/Make environment. |
| `npm run verify` | Run agent-ready validation, syntax checks, and smoke tests. |
| `npm run smoke` | Run the full smoke suite. |
| `npm run dashboard:preview` | Start the local dependency-free dashboard preview server. |
| `npm run demo:e2e` | Run the offline end-to-end demo. |
| `npm run agent:status` | Show the MH-001 through MH-028 task completion state. |

## Documentation Map

User-facing guides:

- [Getting Started](docs/user-guide/getting-started.md)
- [Target Project Creation](docs/user-guide/target-project.md)
- [Agent Task Runs](docs/user-guide/agent-task-run.md)
- [Dashboard Preview](docs/user-guide/dashboard-preview.md)
- [Troubleshooting](docs/user-guide/troubleshooting.md)

Developer guides:

- [Architecture](docs/developer-guide/architecture.md)
- [Agent Adapter](docs/developer-guide/agent-adapter.md)
- [Execution Profile](docs/developer-guide/execution-profile.md)
- [Security Policy](docs/developer-guide/security-policy.md)
- [Testing](docs/developer-guide/testing.md)

History and release notes:

- [MH-001 to MH-028 Summary](docs/development-history/mh-001-to-mh-028-summary.md)
- [Design Decisions](docs/development-history/design-decisions.md)
- [Release Cleanup Notes](docs/development-history/release-cleanup-notes.md)

Portfolio material:

- [Case Study Draft](docs/portfolio/case-study.md)
- [Demo Script Draft](docs/portfolio/demo-script.md)
- [Portfolio Summary Draft](docs/portfolio/portfolio-summary.md)

Existing detailed references remain available under `docs/`, including [Dashboard](docs/DASHBOARD.md), [End-to-End Demo](docs/E2E_DEMO.md), [Test Spec](docs/TEST_SPEC.md), [Portfolio](docs/PORTFOLIO.md), and [Architecture Diagrams](docs/architecture/DIAGRAMS.md).

## Operational Rules

- Do not work directly on `main` for release cleanup or hardening.
- Do not push, publish, deploy, or merge without explicit user request.
- Do not commit `.env*`, secrets, keys, runtime logs, or run artifacts.
- Keep Target Repo raw project data out of Meta.
- Prefer small commits: cleanup notes, operations guidance, docs, and verification report.

See [AGENTS.md](AGENTS.md) for the full maintenance instructions.

