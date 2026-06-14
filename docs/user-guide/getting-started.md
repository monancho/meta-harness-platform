# Getting Started

Meta Harness Platform is the Meta repo. It creates and validates a Target Project Factory, but it does not own the target project's raw planning data, code, logs, or artifacts.

## Prerequisites

- Node.js 20 or newer
- Git
- Bash
- Make for the local doctor check

## First Checks

Run from the repository root:

```bash
npm run doctor
npm run verify
npm run smoke
```

`npm run verify` calls the agent verification script and includes the smoke path. `npm run smoke` is useful when you want the smoke suite alone.

## Recommended First Reading

- [Target Project Creation](target-project.md)
- [Agent Task Runs](agent-task-run.md)
- [Dashboard Preview](dashboard-preview.md)
- [Troubleshooting](troubleshooting.md)
- [Architecture](../developer-guide/architecture.md)

