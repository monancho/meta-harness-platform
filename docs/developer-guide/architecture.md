# Architecture

Meta Harness Platform은 작은 CLI와 core package를 중심으로 구성됩니다.

```text
bin/mh.mjs
packages/core/src/
  cli.mjs
  planning.mjs
  bootstrap.mjs
  runner.mjs
  runner-template.mjs
  security.mjs
  adapters.mjs
  execution-profiles.mjs
  eval-registry.mjs
  signal-exporter.mjs
  release.mjs
  maintenance.mjs
schemas/
templates/
tests/
```

주요 lifecycle은 다음과 같습니다.

```text
empty -> planning-scaffolded -> planning-frozen -> factory-ready -> runnable -> github-connected -> release-ready
```

Meta는 template, schema, policy, sanitized signal을 소유합니다. Target repo는 raw planning data, source code, infrastructure, log, run artifact를 소유합니다.

상세 diagram: [Architecture Diagrams](../architecture/DIAGRAMS.md).
