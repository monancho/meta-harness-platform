# Final Verification Report

## 1. 작업 브랜치

```text
release/final-cleanup-20260614-152148
```

모든 cleanup과 documentation 작업은 이 local release branch에서 수행했습니다. 이 브랜치는 push하지 않았고 `main`에 merge하지 않았습니다.

## 2. Backup Tag

```text
release-cleanup-before-20260614-152434
```

release cleanup 변경 전에 tag를 만들었고, `git tag --list release-cleanup-before-20260614-152434`로 확인했습니다.

## 3. 실행한 검증 명령

```bash
git branch --show-current
git status
npm run agent:status
npm run doctor
npm run verify
npm run smoke
npm run dashboard:preview
npm run demo:e2e
node ./scripts/agent/guard-diff.mjs
```

`npm run dashboard:preview`는 장시간 실행되는 local server이므로 잠깐 실행해 `Meta Harness dashboard preview: http://localhost:4173` 출력을 확인한 뒤 종료했습니다.

## 4. 통과한 검증

- `npm run doctor`: passed
- `npm run verify`: 아래 AGENTS readiness phrase 수정 후 passed
- `npm run smoke`: passed
- `npm run dashboard:preview`: 실행 가능, expected local preview URL 출력 확인
- `npm run demo:e2e`: passed
- `node ./scripts/agent/guard-diff.mjs`: passed

## 5. 실패했다가 수정한 항목

- 최초 `npm run verify`는 `scripts/agent/validate-agent-ready.mjs`가 AGENTS.md에서 `Planning-first` 문구를 기대해 실패했습니다. AGENTS.md 운영 문서 전환 과정에서 개념은 유지했지만 정확한 문구가 빠졌습니다.
- 수정: AGENTS.md에 exact readiness contract language를 복원하고 완료된 `MH-001`부터 `MH-028`까지의 task queue context를 포함했습니다.
- test를 약화하지 않았고 smoke contract를 우회하지 않았습니다.

## 6. 삭제 또는 Ignore 처리한 Runtime Artifact

애매한 파일은 삭제하지 않았습니다.

아래 ignore rule을 보강했습니다.

- `.harness/runs/`
- `.harness/tmp/`
- `.harness/agent-workspace/auto-runs/`
- `.harness/agent-workspace/nightly-logs/`
- `.harness/agent-workspace/autoloop.lock`
- `.tmp-*`
- `INSTANT_NEXT_STEPS.md`
- `RUN_UNTIL_28.sh`
- `RUN_19_TO_28.sh`
- `.env`
- `.env.*`
- `*.pem`
- `*.key`

추가 cleanup note는 [Release Cleanup Notes](release-cleanup-notes.md)에 기록했습니다.

## 7. 의도적으로 남긴 산출물

- `apps/dashboard/package-lock.json`: untracked 상태로 유지했습니다. dashboard는 현재 `apps/dashboard/preview.mjs`로 실행되며 문서화된 runtime path에 `apps/dashboard/package.json`이 없습니다. track/remove 결정 전에 검토가 필요합니다.
- `INSTANT_NEXT_STEPS.md`: ignored build-process note로, 존재하더라도 건드리지 않았습니다.
- `.harness/agent-workspace/auto-runs/`: ignored local automation history로 유지했습니다.
- `.harness/agent-workspace/nightly-logs/`: ignored local runtime history로 유지했습니다.

## 8. 남은 한계

- 이 repo는 여전히 MVP platform skeleton이며 production multi-tenant orchestration이 아닙니다.
- Dashboard preview는 dependency-free static preview infrastructure이며 production dashboard service가 아닙니다.
- GitHub Actions, container worker, kind execution profile은 같은 task packet contract를 기반으로 한 skeleton/extension path입니다.
- untracked `apps/dashboard/package-lock.json`은 merge 전 human review가 필요합니다.

## 9. main 병합 전 확인 사항

사용자는 다음을 확인해야 합니다.

- release branch가 여전히 `release/final-cleanup-20260614-152148`인지
- `apps/dashboard/package-lock.json`을 untracked로 유지할지, 삭제할지, tracked dashboard lockfile로 만들지
- 새 docs 구조가 원하는 한국어/영어 문서 전략과 맞는지
- 최종 명령이 사용자 환경에서도 통과하는지
- runtime log, secret, target-owned artifact가 staged 상태가 아닌지

## 10. Rollback 방법

pre-cleanup 상태를 확인하거나 복구하려면:

```bash
git show release-cleanup-before-20260614-152434
git switch release/final-cleanup-20260614-152148
```

release cleanup branch를 local에서 버리려면 필요한 내용을 보관한 뒤:

```bash
git switch main
git branch -D release/final-cleanup-20260614-152148
```

cleanup branch가 review 및 merge되거나 명시적으로 폐기되기 전에는 backup tag를 삭제하지 않습니다.
