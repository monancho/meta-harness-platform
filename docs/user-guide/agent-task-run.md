# Agent Task 실행

Task run은 task packet으로 구동됩니다. task packet은 editable scope, forbidden scope, verification command, budget, acceptance criteria, expected artifact를 정의합니다.

## Target Repo에서 task 실행

factory bootstrap 이후 실행합니다.

```bash
node ./bin/mh.mjs run --target /tmp/my-target --task .harness/tasks/example.task.json --adapter shell
```

기본 local path는 Target Repo에 생성된 runner를 사용합니다. target이 commit을 가진 git repo이면 runner는 아래 worktree를 생성합니다.

```text
.harness/tmp/worktrees/<run-id>
```

artifact는 아래 위치에 보존됩니다.

```text
.harness/runs/<run-id>/
  patch.diff
  run-result.json
  summary.md
```

`--cleanup false`는 inspection을 위해 worktree를 남깁니다. 기본 cleanup은 temporary worktree만 제거하고 run artifact는 보존합니다.
