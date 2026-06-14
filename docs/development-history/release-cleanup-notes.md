# Release Cleanup Notes

This note records cleanup candidates found during final hardening on branch `release/final-cleanup-20260614-152148`. Ambiguous files were not deleted.

## Ignored Runtime Artifacts

| Path | Current handling | Reason |
|---|---|---|
| `.harness/runs/` | ignored | Meta-level run artifacts are runtime output. |
| `.harness/tmp/` | ignored | Temporary worktrees and transient runner state. |
| `.harness/agent-workspace/auto-runs/` | ignored | Automated local agent prompts and logs. |
| `.harness/agent-workspace/nightly-logs/` | ignored | Nightly and batch execution logs. |
| `.harness/agent-workspace/autoloop.lock` | ignored | Local process lock file. |
| `.tmp-*` | ignored | Local scratch directories and files. |
| `INSTANT_NEXT_STEPS.md` | ignored, left in place if present | One-off implementation note from the build process. |
| `RUN_UNTIL_28.sh` | ignored | One-off task runner script name. |
| `RUN_19_TO_28.sh` | ignored | One-off task runner script name. |

## Ambiguous Items Left For Review

- `apps/dashboard/package-lock.json`: present as an untracked file during cleanup. The dashboard currently uses `apps/dashboard/preview.mjs` and has no `apps/dashboard/package.json` in the documented runtime path, so this file was not deleted or added. Review whether it came from a local npm command before deciding to track or remove it.
- `INSTANT_NEXT_STEPS.md`: ignored build-process note. It is not part of the final user or developer guide structure, but it was left untouched.
- `.harness/agent-workspace/auto-runs/`: ignored local automation history. It may be useful for local debugging, but should not be committed.
- `.harness/agent-workspace/nightly-logs/`: ignored local nightly run history. It may be useful for local debugging, but should not be committed.

## Policy

Do not commit secrets, tokens, `.env*`, PEM/key material, runtime logs, generated run artifacts, or local worktree temp directories. If a cleanup candidate is ambiguous, document it here before deleting it.
