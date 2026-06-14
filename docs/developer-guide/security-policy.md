# Security Policy

보안은 task packet scope, runtime policy, repository ignore rule을 통해 적용됩니다.

## 절대 커밋하지 않을 것

- `.env` 또는 `.env.*`
- secret, token, PEM file, private key
- production deploy workflow 또는 production credential
- runtime log와 run artifact
- Meta로 복사된 raw Target Repo project data

## Scope Rules

worker는 다음을 지켜야 합니다.

- `task.editableScope`
- `task.forbiddenScope`
- runtime policy forbidden paths

일반적인 forbidden path에는 production infra, deploy-prod workflow, secret-like file, long-lived credential이 포함됩니다.

## Sanitized Learning Only

Meta는 failure category, reason code, runtime bucket, retry count, template improvement signal, generator version, execution profile 같은 일반화된 signal만 저장할 수 있습니다. Target Repo의 raw PRD, code, log, business document는 저장하면 안 됩니다.
