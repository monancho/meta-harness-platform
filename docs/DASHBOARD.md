# Dashboard Preview

MH-011 adds a local dashboard skeleton under `apps/dashboard`.

The dashboard is a dependency-free static fallback instead of a Vite install. This keeps the existing no-network smoke path intact while reserving a clear frontend workspace for later React/Vite migration.

Run it locally:

```bash
npm run dashboard:preview
```

Open `http://localhost:4173`.

The preview loads sample fixtures from `apps/dashboard/fixtures`: `run-result.json`, `manifest.lock`, `state.yml`, and `task-packet.json`. These fixtures are sanitized examples owned by the Meta repo and do not copy raw target project data.
