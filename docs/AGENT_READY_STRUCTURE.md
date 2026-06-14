# Agent-ready Structure

```text
meta-harness-platform/
├─ AGENTS.md
├─ CLAUDE.md
├─ .codex/
│  ├─ config.toml
│  └─ prompts/start-next-task.md
├─ .harness/agent-workspace/
│  ├─ README.md
│  ├─ backlog.yml
│  ├─ quality-gates.yml
│  ├─ contracts/output-contract.md
│  ├─ policies/
│  │  ├─ editable-scope.yml
│  │  ├─ forbidden-scope.yml
│  │  └─ command-policy.yml
│  └─ tasks/
│     ├─ MH-001-repository-restructure.task.json
│     ├─ MH-002-schema-validation.task.json
│     ├─ MH-003-state-machine.task.json
│     ├─ MH-004-manifest-ownership.task.json
│     ├─ MH-005-l0-worktree-runner.task.json
│     ├─ MH-006-task-packet-compiler.task.json
│     ├─ MH-007-security-policy.task.json
│     ├─ MH-008-agent-adapter-layer.task.json
│     ├─ MH-009-codex-adapter.task.json
│     ├─ MH-010-github-pr-loop.task.json
│     ├─ MH-011-react-dashboard-skeleton.task.json
│     ├─ MH-012-run-history-and-artifact-viewer.task.json
│     ├─ MH-013-patch-diff-viewer.task.json
│     ├─ MH-014-security-gate-enforcement.task.json
│     ├─ MH-015-upgrade-engine-dry-run.task.json
│     ├─ MH-016-managed-block-update-strategy.task.json
│     ├─ MH-017-github-actions-execution-profile.task.json
│     ├─ MH-018-container-worker-execution-profile.task.json
│     ├─ MH-019-kind-namespace-execution-profile.task.json
│     ├─ MH-020-eval-registry-skeleton.task.json
│     ├─ MH-021-sanitized-signal-exporter.task.json
│     ├─ MH-022-feedback-pattern-analyzer.task.json
│     ├─ MH-023-productization-audit-harness.task.json
│     ├─ MH-024-release-harness-skeleton.task.json
│     ├─ MH-025-maintenance-harness-skeleton.task.json
│     ├─ MH-026-end-to-end-demo-project.task.json
│     ├─ MH-027-portfolio-landing-page.task.json
│     └─ MH-028-demo-video-script-and-readme-polish.task.json
├─ templates/target-repo/
│  ├─ AGENTS.md
│  └─ CLAUDE.md
└─ docs/
   ├─ AGENT_START_HERE.md
   ├─ AGENT_TASK_INDEX.md
   ├─ AGENT_READY_STRUCTURE.md
   └─ FULL_HARNESS_BACKLOG.md
```

This structure is designed so an agent can start from a task packet without reinterpreting the entire project. The queue now covers MVP hardening through dashboard, security gates, execution profiles, eval/feedback, productization, release, maintenance, and portfolio delivery.
