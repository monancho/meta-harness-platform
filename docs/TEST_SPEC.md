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

## T-031 Task Packet Compiler

- 명령: `mh plan compile-tasks --target <dir>`
- 입력:
  - `.harness/planning/backlog.items.json`
  - `.harness/planning/acceptance-criteria.json`
  - `.harness/planning/verification-map.json`
- 기대 결과:
  - `.harness/tasks/*.task.json` 생성
  - task packet은 `objective`, `editableScope`, `forbiddenScope`, `acceptanceCriteria`, `verifyCommands`, `budgets`, `expectedArtifacts`를 포함한다.
  - backlog item의 acceptance criteria가 비어 있거나 존재하지 않는 ID를 참조하면 명확한 오류로 실패해야 한다.

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

- 명령: `mh run --target <dir> --task .harness/tasks/BL-001.task.json --adapter shell`
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
- task packet의 `editableScope`/`forbiddenScope`가 절대 경로, 상위 경로, `.git`, `node_modules` 같은 금지 범위를 포함하면 실행 전 실패한다.
- runner는 실행 전 `commands.verify`와 `verifyCommands`를 runtime command policy로 검사하고, `git push*`, `npm publish*`, `docker login*` 같은 deny command를 차단한다.
- runner는 task packet, verify command, child process 환경, run artifact에서 practical secret-like pattern을 검사하거나 필터링한다.
- 보안 게이트 실패 시 `run-result.json`은 `status: failed`, `failureCategory: security`, `reasonCode: MH_SECURITY_*`를 포함해야 한다.
- 실행 후 `changedFiles`와 `patch.diff` 경로가 `.env*`, `infra/**/production/**`, `.github/workflows/deploy-prod.yml`에 닿으면 실패해야 한다.

## T-080 Codex Adapter

- Smoke test는 실제 Codex CLI 설치를 요구하지 않는다. fake `MH_CODEX_BINARY`로 adapter lifecycle, prompt artifact, output artifact, patch collection을 검증한다.
- Codex CLI가 없으면 `MH_CODEX_BINARY_NOT_FOUND` reasonCode와 함께 실패해야 한다.
- 수동 확인 명령:

```bash
node ./bin/mh.mjs run --target <target-repo> --task .harness/tasks/BL-001.task.json --adapter codex
```

- 수동 확인 기대 결과:
  - `.harness/runs/<run-id>/codex-prompt.md`
  - `.harness/runs/<run-id>/codex-output.log`
  - `.harness/runs/<run-id>/patch.diff`
  - `.harness/runs/<run-id>/run-result.json`
  - `.harness/runs/<run-id>/summary.md`

## T-085 Upgrade Dry-run

- 명령: `mh factory upgrade --target <dir> --dry-run`
- 입력:
  - `.harness/manifest.lock`
  - `.harness/planning/build-handoff.json`
  - 현재 Meta Harness factory templates
- 기대 결과:
  - target의 managed files를 직접 수정하지 않는다.
  - `.harness/upgrades/upgrade-report.json`을 생성한다.
  - `.harness/upgrades/upgrade-summary.md`를 생성한다.
  - 각 managed file을 `safe-auto`, `changed-by-user`, `conflict`, `propose-only`, `ignored` 중 하나로 분류한다.
  - target 파일 checksum, manifest baseline checksum, 현재 template checksum을 비교 기준으로 기록한다.

## T-090 GitHub PR Loop Skeleton

- 명령: `mh github pr --target <dir> --run <run-id>`
- 기대 결과:
  - stdout에 PR body markdown을 출력한다.
  - `.harness/runs/<run-id>/pr-body.md`를 생성한다.
  - 기본 실행은 G0 local patch 모드이며 `gh` 또는 network를 요구하지 않는다.
- 명령: `mh github pr --target <dir> --run <run-id> --create`
- 기대 결과:
  - G1 gh PR 모드로 branch, commit, PR 생성을 시도한다.
  - `gh`가 없으면 설치 또는 인증 방법과 `--create` 없는 G0 재실행 방법을 안내하며 실패한다.
  - G2 GitHub Actions PR loop는 후속 단계로 문서화되어야 한다.

## T-100 GitHub Actions Execution Profile

- `factory bootstrap`은 `.github/workflows/harness-run.yml`을 생성해야 한다.
- workflow는 자동 `push`/`pull_request` trigger 없이 `workflow_dispatch`로만 시작되어야 한다.
- `workflow_dispatch`는 `task_path`, `adapter`, `execution_profile` 입력을 가져야 한다.
- workflow는 기본적으로 `enabled: false` 입력으로 비활성화되어야 하고, 수동 실행 시 `true`로 바꿀 수 있어야 한다.
- 기본 permissions는 `contents: read`로 제한한다.
- workflow는 harness runner 실행 후 `patch.diff`, `run-result.json`, `summary.md`를 artifact로 업로드해야 한다.
- workflow summary는 local run의 `summary.md` 내용을 반영해야 한다.
- PR comments/checks/branch writes는 write 권한과 hardening이 필요하므로 후속 단계로 남겨야 한다.
