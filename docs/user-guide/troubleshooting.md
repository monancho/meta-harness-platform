# Troubleshooting

## 실제 script 확인

root `package.json`을 source of truth로 사용합니다. 존재하지 않는 package script를 가정하지 않습니다.

일반 확인 명령:

```bash
npm run doctor
npm run verify
npm run smoke
npm run agent:status
```

## Dashboard Preview가 계속 실행되는 경우

`npm run dashboard:preview`는 local HTTP server를 시작합니다. 검증 목적이라면 preview URL 출력만 확인한 뒤 Ctrl-C나 test harness timeout으로 종료해도 됩니다.

## Git Worktree Run 실패

target이 최소 하나의 commit을 가진 git repository인지 확인합니다.

```bash
git -C /tmp/my-target status
git -C /tmp/my-target rev-parse --verify HEAD
```

non-git target은 fallback mode를 사용합니다. git target은 isolated execution을 위해 `.harness/tmp/worktrees/<run-id>`를 사용하고 artifact를 `.harness/runs/<run-id>`에 보존합니다.

## Runtime File이 로컬에 생긴 경우

runtime artifact와 local log는 ignore됩니다. 애매한 파일을 삭제하기 전 [Release Cleanup Notes](../development-history/release-cleanup-notes.md)를 확인하세요.
