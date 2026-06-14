# Execution Profile

The default profile is L0 local worktree execution.

## L0 Local Worktree

When the target is a git repo with a valid `HEAD`, the generated Target runner creates:

```text
.harness/tmp/worktrees/<run-id>
```

The runner executes inside that worktree and writes artifacts to:

```text
.harness/runs/<run-id>/
```

Default cleanup removes the worktree and preserves artifacts. `--cleanup false` keeps the worktree for inspection.

## Fallback Mode

If git is unavailable or the target is not initialized, the runner uses fallback mode so non-git demos continue to work.

## Higher Profiles

GitHub Actions, container worker, and kind namespace profiles are skeletons. They should extend the same task packet and artifact contracts rather than bypassing L0 behavior.

