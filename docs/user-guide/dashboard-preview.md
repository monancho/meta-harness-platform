# Dashboard Preview

The dashboard is a dependency-free static preview. It is not a separate npm package and does not require an `apps/dashboard/package.json`.

Run it from the repository root:

```bash
npm run dashboard:preview
```

Open:

```text
http://localhost:4173
```

The server is `apps/dashboard/preview.mjs`. It serves files from `apps/dashboard/**` and loads sanitized fixtures from `apps/dashboard/fixtures`.

Current views include run history, artifact metadata, task policy, manifest state, and parsed patch diff output. Additional detail is in [Dashboard Preview](../DASHBOARD.md) and [apps/dashboard/README.md](../../apps/dashboard/README.md).

