# Testing

Use the root `package.json` scripts as the source of truth.

## Required Checks

```bash
npm run doctor
npm run verify
npm run smoke
```

## Feature Checks

```bash
npm run dashboard:preview
npm run demo:e2e
```

`npm run dashboard:preview` starts a long-running local server. A verification harness may start it, wait for the URL output, and terminate it.

## Guard Diff

```bash
node ./scripts/agent/guard-diff.mjs
```

Use guard-diff when working inside a task scope or release cleanup scope to catch forbidden path changes.

Do not weaken smoke tests to make changes pass. Fix the implementation or document a real limitation.

