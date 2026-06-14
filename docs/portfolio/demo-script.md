# Demo Script Draft

## 1. Open With The Boundary

Explain that Meta Harness creates and upgrades the factory, while the Target Repo owns planning, code, infra, logs, and artifacts.

## 2. Run Environment Check

```bash
npm run doctor
```

## 3. Run The E2E Demo

```bash
npm run demo:e2e
```

Call out the lifecycle: scaffold planning, synthesize planning docs, compile acceptance, freeze planning, bootstrap factory, run a task, collect artifacts.

## 4. Run Smoke

```bash
npm run smoke
```

Point out that smoke covers planning gates, manifest checks, invalid task validation, git worktree behavior, cleanup behavior, and artifact preservation.

## 5. Show Dashboard Preview

```bash
npm run dashboard:preview
```

Open `http://localhost:4173` and show run history, artifacts, manifest state, task policy, and patch diff parsing.

## 6. Close With Limits

State that this is an MVP skeleton for governed local workflows and extension points, not production multi-tenant orchestration.

