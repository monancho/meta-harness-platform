# Agent Workspace

This directory contains implementation work orders for agents working on the Meta Harness Platform itself.

It is not generated into Target Project Repos.

## Structure

```text
.harness/agent-workspace/
├─ backlog.yml
├─ tasks/
├─ policies/
├─ contracts/
└─ reports/
```

## How to use

1. Open `AGENTS.md`.
2. Pick the first unfinished task in `backlog.yml`.
3. Read the matching `tasks/*.task.json` file.
4. Implement only that task.
5. Run `bash ./tests/smoke.sh`.
6. Summarize changes and remaining gaps.
