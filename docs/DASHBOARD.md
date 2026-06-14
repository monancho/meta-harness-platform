# Dashboard Preview

MH-011은 `apps/dashboard` 아래 local dashboard skeleton을 추가했습니다.

Dashboard는 Vite install 대신 dependency-free static fallback입니다. 이 선택은 기존 no-network smoke path를 유지하면서, 이후 React/Vite migration을 위한 frontend workspace를 남겨둡니다.

로컬 실행:

```bash
npm run dashboard:preview
```

`http://localhost:4173`을 엽니다.

preview는 `apps/dashboard/fixtures`의 sample fixture를 읽습니다: `run-result.json`, `run-history.json`, `manifest.lock`, `state.yml`, `task-packet.json`. 이 fixture는 Meta repo가 소유한 sanitized example이며 raw target project data를 복사하지 않습니다.

run history parser는 `.harness/runs/<run-id>/run-result.json` record를 status, task id, adapter, duration, timestamp, artifact metadata를 가진 dashboard row로 normalize합니다. static preview는 `run-history.json`을 사용하며, unit-level smoke test는 `tests/fixtures/dashboard-runs`의 sanitized run directory를 읽습니다.
