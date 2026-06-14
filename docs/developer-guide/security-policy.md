# Security Policy

Security is enforced through task packet scope, runtime policy, and repository ignore rules.

## Never Commit

- `.env` or `.env.*`
- secrets, tokens, PEM files, private keys
- production deploy workflows or production credentials
- runtime logs and run artifacts
- raw Target Repo project data copied into Meta

## Scope Rules

Workers must respect:

- `task.editableScope`
- `task.forbiddenScope`
- runtime policy forbidden paths

Common forbidden paths include production infra, deploy-prod workflows, secret-like files, and long-lived credentials.

## Sanitized Learning Only

Meta can store generalized signals such as failure categories, reason codes, runtime buckets, retry counts, template improvement signals, generator versions, and execution profiles. It must not store raw PRDs, code, logs, or business documents from a Target Repo.

