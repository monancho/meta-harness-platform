# Meta Harness Dashboard

이 디렉터리는 MH-011에서 추가된 dashboard skeleton입니다. MVP에서는 network access나 package install 없이 smoke test가 동작하도록 dependency-free 구조를 유지합니다.

## Preview

repository root에서 실행합니다.

```bash
npm run dashboard:preview
```

그 다음 `http://localhost:4173`을 엽니다.

preview는 `apps/dashboard/**`만 serve합니다. UI는 `apps/dashboard/fixtures`의 local fixture file을 읽습니다.

- `run-result.json`
- `run-history.json`
- `patch.diff`
- `manifest.lock`
- `state.yml`
- `task-packet.json`

## Views

Runs view는 normalized `.harness/runs/<run-id>/run-result.json` data에서 status, task id, adapter, duration, timestamp를 표시합니다. Artifacts view는 patch, summary, test-report, screenshot, arbitrary artifact file name/link를 보여줍니다.

Patch Diff view는 `patch.diff`를 unified diff로 parse하고 file별 hunk, addition, deletion, context line, summary count, truncation notice, malformed-line warning, task packet `forbiddenScope` 기반 forbidden path warning을 표시합니다.

Parser test는 `tests/fixtures/dashboard-runs`의 sanitized run directory와 `tests/fixtures/dashboard-patches`의 sanitized patch fixture를 사용합니다. smoke test는 external service나 target-owned run artifact에 의존하지 않습니다.
