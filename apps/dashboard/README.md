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
- `manifest.lock`
- `state.yml`
- `task-packet.json`

## Views

The skeleton includes placeholder views for Project State, Runs, Artifacts, Policies, and Settings. Later dashboard tasks can replace the static fixtures with target repository data or run history APIs without changing the smoke-test path.
