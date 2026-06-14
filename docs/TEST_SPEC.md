# Test Specification

## T-001 Doctor

- 명령: `node bin/mh.mjs doctor`
- 기대 결과: Node 버전과 starter 버전을 출력한다.

## T-010 Planning Scaffold

- 명령: `mh scaffold planning --target <dir> --project-id demo`
- 기대 결과:
  - `docs/planning/` 생성
  - `.harness/state.yml` 생성
  - phase가 `planning-scaffolded`
  - `apps/`, `infra/`, `.codex/`는 아직 생성되지 않음

## T-020 Planning Synthesis

- 명령: `mh plan synthesize --target <dir> --input examples/demo-answers.json`
- 기대 결과:
  - `docs/planning/03_PRD.md`
  - `.harness/planning/build-handoff.json`
  - `.harness/planning/backlog.items.json`

## T-030 Acceptance Compiler

- 명령: `mh plan compile-acceptance --target <dir>`
- 기대 결과:
  - `.harness/planning/verification-map.json`
  - `.harness/planning/acceptance-tests.generated.json`

## T-040 Freeze Gate

- 명령: `mh plan freeze --target <dir> --approved`
- 기대 결과:
  - phase가 `planning-frozen`
  - buildHandoffHash가 기록됨

## T-050 Bootstrap Gate

- 승인 전 bootstrap은 실패해야 한다.
- 승인 후 bootstrap은 성공해야 한다.
- 기대 생성물:
  - `apps/web/`
  - `infra/docker/`
  - `.codex/config.toml`
  - `AGENTS.md`
  - `.harness/factory.yml`
  - `.harness/manifest.lock`

## T-060 Harness Run

- 명령: `mh run --target <dir> --task .harness/tasks/example.task.json --adapter shell`
- 기대 결과:
  - `.harness/runs/<run-id>/patch.diff`
  - `.harness/runs/<run-id>/run-result.json`
  - `.harness/runs/<run-id>/summary.md`

## T-061 Schema Validation

- `factory bootstrap`은 `.harness/planning/build-handoff.json`을 검증한 뒤 실행한다.
- `mh run`은 task packet을 검증한 뒤 실행하고, 생성된 `run-result.json`을 검증한다.
- 필수 필드가 빠진 입력은 `MH_SCHEMA_VALIDATION_FAILED` 코드와 함께 실패해야 한다.

## T-070 Security Boundary Smoke

- shell adapter는 `.env*`, production infra, deploy-prod workflow를 생성하거나 수정하지 않는다.
