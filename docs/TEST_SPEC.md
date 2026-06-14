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
  - 허용 전이는 `empty -> planning-scaffolded -> planning-frozen -> factory-ready -> runnable`이다.
  - 각 상태 변경은 결정적 순서로 기록되고 관련 산출물 hash를 포함한다.

## T-050 Bootstrap Gate

- 승인 전 bootstrap은 실패해야 한다.
- `factory bootstrap`은 phase가 `planning-frozen`일 때만 성공해야 한다.
- 승인 후 bootstrap은 성공해야 한다.
- 기대 생성물:
  - `apps/web/`
  - `infra/docker/`
  - `.codex/config.toml`
  - `AGENTS.md`
  - `.harness/factory.yml`
  - `.harness/manifest.lock`

## T-051 Manifest Ownership

- `manifest.lock`은 generator version, build-handoff hash, planning answers hash, managed files를 기록해야 한다.
- 각 managed file은 `ownership`, `checksum`, `mergeStrategy`, `conflictPolicy`를 가져야 한다.
- `AGENTS.md`와 `.github/workflows/**`는 `ownership: shared`여야 한다.
- `infra/caddy/**`는 `mergeStrategy: propose-only`여야 한다.
- `.env*`, secret/token/pem 성격의 파일은 managed files에 포함되지 않아야 한다.
- `mh manifest check --target <dir>`는 managed file checksum drift를 감지해야 한다.

## T-060 Harness Run

- 명령: `mh run --target <dir> --task .harness/tasks/example.task.json --adapter shell`
- 기대 결과:
  - phase가 `factory-ready` 또는 `runnable`이 아니면 실패해야 한다.
  - 성공 후 phase가 `runnable`로 전이된다.
  - `.harness/state.yml`에 lastRunResultHash가 기록된다.
  - `.harness/runs/<run-id>/patch.diff`
  - `.harness/runs/<run-id>/run-result.json`
  - `.harness/runs/<run-id>/summary.md`

## T-061 Schema Validation

- `factory bootstrap`은 `.harness/planning/build-handoff.json`을 검증한 뒤 실행한다.
- `mh run`은 task packet을 검증한 뒤 실행하고, 생성된 `run-result.json`을 검증한다.
- 필수 필드가 빠진 입력은 `MH_SCHEMA_VALIDATION_FAILED` 코드와 함께 실패해야 한다.

## T-070 Security Boundary Smoke

- shell adapter는 `.env*`, production infra, deploy-prod workflow를 생성하거나 수정하지 않는다.
