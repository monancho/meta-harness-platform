# Release Cleanup Notes

이 문서는 `release/final-cleanup-20260614-152148` 브랜치에서 final hardening 중 발견한 cleanup 후보를 기록합니다. 애매한 파일은 삭제하지 않았습니다.

## Ignore 처리된 Runtime Artifact

| Path | Current handling | Reason |
|---|---|---|
| `.harness/runs/` | ignored | Meta-level run artifact는 runtime output입니다. |
| `.harness/tmp/` | ignored | temporary worktree와 transient runner state입니다. |
| `.harness/agent-workspace/auto-runs/` | ignored | automated local agent prompt와 log입니다. |
| `.harness/agent-workspace/nightly-logs/` | ignored | nightly와 batch execution log입니다. |
| `.harness/agent-workspace/autoloop.lock` | ignored | local process lock file입니다. |
| `.tmp-*` | ignored | local scratch directory/file입니다. |
| `INSTANT_NEXT_STEPS.md` | ignored, present이면 유지 | build 과정의 one-off note로 보입니다. |
| `RUN_UNTIL_28.sh` | ignored | one-off task runner script name입니다. |
| `RUN_19_TO_28.sh` | ignored | one-off task runner script name입니다. |

## 삭제하지 않고 남긴 검토 항목

- `apps/dashboard/package-lock.json`: cleanup 중 untracked file로 확인했습니다. dashboard는 현재 `apps/dashboard/preview.mjs`를 사용하며 문서화된 runtime path에 `apps/dashboard/package.json`이 없으므로 삭제하거나 add하지 않았습니다. local npm command에서 생긴 파일인지 확인한 뒤 track/remove를 결정하세요.
- `INSTANT_NEXT_STEPS.md`: ignored build-process note입니다. 최종 user/developer guide 구조에는 포함하지 않았지만 파일은 건드리지 않았습니다.
- `.harness/agent-workspace/auto-runs/`: ignored local automation history입니다. local debugging에는 쓸 수 있지만 commit하면 안 됩니다.
- `.harness/agent-workspace/nightly-logs/`: ignored local nightly run history입니다. local debugging에는 쓸 수 있지만 commit하면 안 됩니다.

## Policy

secret, token, `.env*`, PEM/key material, runtime log, generated run artifact, local worktree temp directory를 커밋하지 않습니다. cleanup 후보가 애매하면 삭제하기 전에 이 문서에 기록합니다.
