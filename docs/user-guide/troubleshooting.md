# Troubleshooting

## Verify The Actual Scripts

Use the root `package.json` as the source of truth. Do not assume package scripts that are not present.

Common checks:

```bash
npm run doctor
npm run verify
npm run smoke
npm run agent:status
```

## Dashboard Preview Keeps Running

`npm run dashboard:preview` starts a local HTTP server. For verification, it is enough to confirm that it prints the preview URL, then stop it with Ctrl-C or a test harness timeout.

## Git Worktree Run Fails

Confirm the target is a git repository with at least one commit:

```bash
git -C /tmp/my-target status
git -C /tmp/my-target rev-parse --verify HEAD
```

Non-git targets use fallback mode. Git targets use `.harness/tmp/worktrees/<run-id>` for isolated execution and preserve artifacts in `.harness/runs/<run-id>`.

## Runtime Files Appear Locally

Runtime artifacts and local logs are ignored. See [Release Cleanup Notes](../development-history/release-cleanup-notes.md) before deleting ambiguous files.

