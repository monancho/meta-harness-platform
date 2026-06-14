# Implementation Notes

## MVP 범위

현재 starter는 실제 AI provider 없이도 실행 가능한 **Shell Adapter**를 제공합니다. 이 구조를 먼저 검증한 뒤 Codex Adapter, Claude Adapter, OpenHands Adapter를 추가합니다.

## 구현 순서

1. CLI command layer
2. planning scaffold
3. planning synthesis
4. acceptance compiler
5. freeze gate
6. factory bootstrap
7. shell runner
8. artifact collection
9. Codex adapter
10. GitHub PR loop
11. GitHub Actions execution profile skeleton
12. Optional kind namespace execution profile skeleton

## 내부 패키지 구조

MH-001부터 단일 파일 CLI skeleton은 `packages/core` 중심 구조로 분리합니다.

| 영역 | 구현 위치 |
|---|---|
| CLI entrypoint | `bin/mh.mjs` |
| CLI dispatch | `packages/core/src/cli.mjs` |
| 파일/JSON/해시 유틸리티 | `packages/core/src/fs-utils.mjs` |
| Target state 처리 | `packages/core/src/state.mjs` |
| Planning scaffold/synthesize/freeze | `packages/core/src/planning.mjs` |
| Factory bootstrap | `packages/core/src/bootstrap.mjs` |
| Run 위임과 target runner template | `packages/core/src/runner.mjs`, `packages/core/src/runner-template.mjs` |
| Managed block upgrade | `packages/core/src/managed-blocks.mjs`, `packages/core/src/upgrade.mjs` |

## Managed Block Upgrade Contract

Shared generated files can use `mergeStrategy: managed-blocks` in `manifest.lock`.
Managed regions are delimited with matching marker lines:

```text
BEGIN META-HARNESS MANAGED BLOCK: <block-id>
END META-HARNESS MANAGED BLOCK: <block-id>
```

The marker may be wrapped in the host file's comment syntax, such as Markdown
`<!-- ... -->` or YAML `# ...`. During upgrade planning, Meta Harness replaces
only the content between matching markers and preserves all user-owned content
outside the block. Missing, duplicated, mismatched, or nested markers are
reported as conflicts instead of being updated.

`bin/mh.mjs`는 기존 사용자 명령을 유지하는 entrypoint로 남고, 내부 구현만 core 모듈로 위임합니다.

## 다음 확장 포인트

| 확장 | 구현 위치 |
|---|---|
| Codex Adapter | `.harness/agents/adapters.yml`, `.harness/bin/runner.mjs` |
| Container Worker | `execution-profiles.yml`의 L1_CONTAINER_WORKER |
| kind Namespace | `execution-profiles.yml`의 L2_KIND_NAMESPACE |
| GitHub Action Runner | `.github/workflows/harness-run.yml` |
| Eval Registry | `meta-harness-platform/evals/` |
| Sanitized Feedback | `.harness/feedback/` |

## L3 GitHub Actions Profile

Factory bootstrap generates `.github/workflows/harness-run.yml` as a shared,
managed-block workflow. It has no `push` or `pull_request` trigger, so remote
harness execution is disabled for automatic CI by default. Operators can start
it manually with `workflow_dispatch` and must set the `enabled` input to `true`.

The workflow accepts:

- `task_path`: target repo task packet path, for example `.harness/tasks/example.task.json`
- `adapter`: `shell` or `codex`
- `execution_profile`: currently `L3_GITHUB_ACTION`

The job wraps the target repo runner, uploads `patch.diff`, `run-result.json`,
and `summary.md`, and appends the generated `summary.md` to the GitHub Actions
step summary. Required default permission is only `contents: read`, because the
skeleton checks out code and uploads artifacts but does not write branches,
checks, pull request comments, or repository contents.

PR comments/checks are intentionally staged behind later hardening. Those
features require write-scoped permissions such as `pull-requests: write`,
`checks: write`, or `contents: write`, and need additional guardrails for forked
PRs, token exposure, patch provenance, and comment spam/idempotency.

## L2 kind Namespace Profile

`L2_KIND_NAMESPACE` is disabled by default. A normal `factory bootstrap` only
declares the profile in `.harness/execution-profiles.yml`; it does not generate
`infra/local-task-k8s/**`. Operators must opt in explicitly:

```bash
node ./bin/mh.mjs factory bootstrap --target ../target-project --enable-kind-namespace
```

When enabled, bootstrap generates `infra/local-task-k8s/` skeleton templates for
namespace-per-run execution:

1. create one namespace for the run
2. run worker, preview, and QA jobs
3. collect logs/artifacts into `.harness/runs/<run-id>/`
4. cleanup the namespace

The generated files are configuration templates only. Smoke tests verify file
generation and lifecycle markers without requiring a live Kubernetes cluster.

Cluster-per-session keeps one local kind cluster alive across runs and creates a
fresh namespace per run. It is faster and fits repeated local QA, but stale
cluster-level resources can leak between runs if cleanup is incomplete.

Cluster-per-run creates and destroys a whole kind cluster for each run. It gives
stronger isolation for debugging cluster-level changes, but startup is slower
and artifact collection must happen before the cluster is destroyed.
