# Maintenance Harness

The Maintenance Harness skeleton is generated into Target Repos during `factory bootstrap`.

Generated files:

- `.harness/maintenance/config.yml`
- `.harness/maintenance/task-types.json`
- `.harness/maintenance/backlog.items.json`
- `.harness/maintenance/templates/dependency.task-template.json`
- `.harness/maintenance/templates/security.task-template.json`
- `.harness/maintenance/templates/bugfix.task-template.json`
- `.harness/maintenance/templates/incident.task-template.json`
- `docs/operations/incident-report.md`
- `docs/operations/postmortem.md`

Maintenance task kinds map to task packet types:

- `dependency` -> `maintenance-dependency`
- `security` -> `maintenance-security`
- `bugfix` -> `maintenance-bugfix`
- `incident` -> `maintenance-incident`

Create a maintenance backlog item and task packet from structured JSON:

```bash
mh maintenance create --target ./target-repo --input ./maintenance-input.json
```

The command writes:

- `.harness/maintenance/backlog.items.json`
- `.harness/tasks/<id>.task.json`

Input files use `schemas/maintenance-input.contract.json`. Keep raw project evidence, logs, and incident details in the Target Repo only.
