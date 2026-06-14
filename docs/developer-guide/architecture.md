# Architecture

Meta Harness Platform is organized around a small CLI and core package.

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

The main lifecycle is:

```text
empty -> planning-scaffolded -> planning-frozen -> factory-ready -> runnable -> github-connected -> release-ready
```

Meta owns templates, schemas, policies, and sanitized signals. Target repos own raw planning data, source code, infrastructure, logs, and run artifacts.

Detailed diagrams: [Architecture Diagrams](../architecture/DIAGRAMS.md).

