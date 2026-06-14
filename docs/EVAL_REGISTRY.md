# Eval Registry

The eval registry stores Meta Harness regression definitions in this repository without relying on an external eval platform.

Use:

```bash
node ./bin/mh.mjs eval list
node ./bin/mh.mjs eval run --suite local-smoke --no-network
```

Built-in suites:

- `local-smoke`: fast synthetic checks for CLI and registry wiring.
- `acceptance-regression`: synthetic checks for acceptance compiler contracts.
- `factory-upgrade-regression`: synthetic checks for factory upgrade surfaces.

Eval suites are different from product tests. Product tests belong to a target repository and validate that product's application code, infrastructure, and user-facing behavior. Eval suites belong to Meta Harness and validate generator behavior, regression categories, command wiring, output contracts, and upgrade surfaces across projects.

Eval fixtures must not contain raw user project data. They can use synthetic files, sanitized failure categories, gate reason codes, runtime buckets, retry counts, generator versions, and execution profiles. This keeps the registry useful for comparison while preserving target ownership of PRDs, code, logs, and artifacts.

Result files are deterministic JSON. They omit timestamps and durations, sort stable collections, and store stdout/stderr hashes instead of raw command logs so later runs can be compared directly.
