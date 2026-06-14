# Productization Audit Harness

The productization audit harness adds a lightweight release-quality checklist to generated Target Repos.

Generated Target Repos receive:

- `.harness/productization/audit-checklist.yml`
- audit categories for UX, a11y, responsive, performance, security, content, and release-readiness

Generate or refresh the checklist manually:

```bash
node ./bin/mh.mjs productization init --target ../target-project --force
```

Generate the report:

```bash
node ./bin/mh.mjs productization report --target ../target-project
```

The report is written to `.harness/productization/productization-report.md` by default. It reads checklist statuses and the latest `.harness/runs/<run-id>/run-result.json` artifact when present.

The harness does not auto-fix by default. Checks that are not passing become hardening backlog items in the report so the Target Repo can decide how to scope follow-up work.
