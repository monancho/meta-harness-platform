# Meta Harness Dashboard

This is the MH-011 dashboard skeleton. It is intentionally dependency-free for the MVP so smoke tests do not need network access or a package install.

## Preview

From the repository root:

```bash
npm run dashboard:preview
```

Then open `http://localhost:4173`.

The preview serves only `apps/dashboard/**`. The UI reads local fixture files from `apps/dashboard/fixtures`:

- `run-result.json`
- `run-history.json`
- `patch.diff`
- `manifest.lock`
- `state.yml`
- `task-packet.json`

## Views

The Runs view lists status, task id, adapter, duration, and timestamp from normalized `.harness/runs/<run-id>/run-result.json` data. The Artifacts view shows patch, summary, test-report, screenshot, and arbitrary artifact file names or links.

The Patch Diff view parses `patch.diff` as a unified diff, groups hunks by file, and shows additions, deletions, context lines, summary counts, truncation notices, malformed-line warnings, and forbidden path warnings based on the task packet `forbiddenScope`.

Parser tests use sanitized run directories under `tests/fixtures/dashboard-runs` and sanitized patch fixtures under `tests/fixtures/dashboard-patches` so smoke tests do not need external services or target-owned run artifacts.
