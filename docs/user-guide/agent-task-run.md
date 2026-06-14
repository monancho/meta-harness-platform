# Agent Task Run

A task run is driven by a task packet. The packet defines editable scope, forbidden scope, verification commands, budgets, acceptance criteria, and expected artifacts.

## Run A Task In A Target Repo

After factory bootstrap:

```bash
node ./bin/mh.mjs run --target /tmp/my-target --task .harness/tasks/example.task.json --adapter shell
```

The default local path uses the Target Repo's generated runner. When the target is a git repo with a commit, the runner creates a worktree under:

```text
.harness/tmp/worktrees/<run-id>
```

Artifacts are preserved under:

```text
.harness/runs/<run-id>/
  patch.diff
  run-result.json
  summary.md
```

`--cleanup false` keeps the worktree for inspection. Default cleanup removes the temporary worktree but keeps run artifacts.

