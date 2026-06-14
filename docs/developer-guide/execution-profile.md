# Execution Profile

기본 profile은 L0 local worktree execution입니다.

## L0 Local Worktree

Target이 valid `HEAD`를 가진 git repo이면 생성된 Target runner가 아래 경로를 만듭니다.

```text
.harness/tmp/worktrees/<run-id>
```

runner는 해당 worktree 안에서 실행되고 artifact를 아래 경로에 씁니다.

```text
.harness/runs/<run-id>/
```

기본 cleanup은 worktree를 삭제하고 artifact를 보존합니다. `--cleanup false`는 inspection을 위해 worktree를 남깁니다.

## Fallback Mode

git을 사용할 수 없거나 target이 초기화되지 않은 경우 runner는 fallback mode를 사용합니다. 이 경로는 non-git demo가 계속 동작하도록 유지합니다.

## Higher Profiles

GitHub Actions, container worker, kind namespace profile은 skeleton입니다. L0 behavior를 우회하지 않고 같은 task packet과 artifact contract를 확장해야 합니다.
