# Full Harness Backlog

This backlog extends the starter package so implementation can proceed from MVP to the planned full harness.

## Completion levels

| Level | Target | Required tasks |
|---:|---|---|
| L1 | Agent-ready starter | Existing package validates and smoke test passes. |
| L2 | Local MVP Harness | MH-001 ~ MH-006 |
| L3 | Real Agent Harness | MH-001 ~ MH-010 |
| L4 | Team-ready Beta | MH-001 ~ MH-018 |
| L5 | Full Project Factory Harness | MH-001 ~ MH-028 |

## Task list

| Task | Priority | Title | Task packet |
|---|---|---|---|
| MH-001 | P0 | Repository restructure for implementation-ready codebase | `.harness/agent-workspace/tasks/MH-001-repository-restructure.task.json` |
| MH-002 | P0 | Schema contracts and validation engine | `.harness/agent-workspace/tasks/MH-002-schema-validation.task.json` |
| MH-003 | P0 | Factory state machine enforcement | `.harness/agent-workspace/tasks/MH-003-state-machine.task.json` |
| MH-004 | P0 | Manifest lock and generated file ownership | `.harness/agent-workspace/tasks/MH-004-manifest-ownership.task.json` |
| MH-005 | P0 | Real L0 git worktree runner | `.harness/agent-workspace/tasks/MH-005-l0-worktree-runner.task.json` |
| MH-006 | P1 | Task packet compiler hardening | `.harness/agent-workspace/tasks/MH-006-task-packet-compiler.task.json` |
| MH-007 | P1 | Security policy enforcement | `.harness/agent-workspace/tasks/MH-007-security-policy.task.json` |
| MH-008 | P1 | Agent adapter layer | `.harness/agent-workspace/tasks/MH-008-agent-adapter-layer.task.json` |
| MH-009 | P2 | Codex adapter implementation | `.harness/agent-workspace/tasks/MH-009-codex-adapter.task.json` |
| MH-010 | P2 | GitHub PR loop skeleton | `.harness/agent-workspace/tasks/MH-010-github-pr-loop.task.json` |
| MH-011 | P2 | React Dashboard skeleton | `.harness/agent-workspace/tasks/MH-011-react-dashboard-skeleton.task.json` |
| MH-012 | P2 | Run history and artifact viewer | `.harness/agent-workspace/tasks/MH-012-run-history-and-artifact-viewer.task.json` |
| MH-013 | P2 | Patch diff viewer | `.harness/agent-workspace/tasks/MH-013-patch-diff-viewer.task.json` |
| MH-014 | P1 | Security gate enforcement | `.harness/agent-workspace/tasks/MH-014-security-gate-enforcement.task.json` |
| MH-015 | P2 | Upgrade engine dry-run | `.harness/agent-workspace/tasks/MH-015-upgrade-engine-dry-run.task.json` |
| MH-016 | P2 | Managed block update strategy | `.harness/agent-workspace/tasks/MH-016-managed-block-update-strategy.task.json` |
| MH-017 | P3 | GitHub Actions execution profile | `.harness/agent-workspace/tasks/MH-017-github-actions-execution-profile.task.json` |
| MH-018 | P3 | Container worker execution profile | `.harness/agent-workspace/tasks/MH-018-container-worker-execution-profile.task.json` |
| MH-019 | P4 | kind namespace execution profile | `.harness/agent-workspace/tasks/MH-019-kind-namespace-execution-profile.task.json` |
| MH-020 | P3 | Eval registry skeleton | `.harness/agent-workspace/tasks/MH-020-eval-registry-skeleton.task.json` |
| MH-021 | P3 | Sanitized signal exporter | `.harness/agent-workspace/tasks/MH-021-sanitized-signal-exporter.task.json` |
| MH-022 | P3 | Feedback pattern analyzer | `.harness/agent-workspace/tasks/MH-022-feedback-pattern-analyzer.task.json` |
| MH-023 | P4 | Productization audit harness | `.harness/agent-workspace/tasks/MH-023-productization-audit-harness.task.json` |
| MH-024 | P4 | Release harness skeleton | `.harness/agent-workspace/tasks/MH-024-release-harness-skeleton.task.json` |
| MH-025 | P4 | Maintenance harness skeleton | `.harness/agent-workspace/tasks/MH-025-maintenance-harness-skeleton.task.json` |
| MH-026 | P2 | End-to-end demo project | `.harness/agent-workspace/tasks/MH-026-end-to-end-demo-project.task.json` |
| MH-027 | P3 | Portfolio landing page | `.harness/agent-workspace/tasks/MH-027-portfolio-landing-page.task.json` |
| MH-028 | P3 | Demo video script and README polish | `.harness/agent-workspace/tasks/MH-028-demo-video-script-and-readme-polish.task.json` |

## Practical implementation guidance

For personal use and portfolio value, do not wait for L5 before publishing the project. A strong public milestone is:

```text
MH-001 ~ MH-006 complete
+ MH-011 dashboard skeleton
+ MH-026 end-to-end demo
+ MH-028 README/demo polish
```

That milestone demonstrates planning scaffold, factory bootstrap, task packet execution, artifacts, and visual explanation. Continue to L5 only after the local MVP is stable.
