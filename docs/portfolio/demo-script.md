# Demo Script 초안

## 1. Boundary로 시작

Meta Harness는 factory를 생성하고 업그레이드하며, Target Repo는 planning, code, infra, log, artifact를 소유한다고 설명합니다.

## 2. Environment Check 실행

```bash
npm run doctor
```

## 3. E2E Demo 실행

```bash
npm run demo:e2e
```

lifecycle을 짚습니다: scaffold planning, synthesize planning docs, compile acceptance, freeze planning, bootstrap factory, run a task, collect artifacts.

## 4. Smoke 실행

```bash
npm run smoke
```

smoke가 planning gate, manifest check, invalid task validation, git worktree behavior, cleanup behavior, artifact preservation을 검증한다는 점을 보여줍니다.

## 5. Dashboard Preview 보여주기

```bash
npm run dashboard:preview
```

`http://localhost:4173`을 열고 run history, artifact, manifest state, task policy, patch diff parsing을 보여줍니다.

## 6. 한계로 마무리

이것은 governed local workflow와 extension point를 위한 MVP skeleton이며 production multi-tenant orchestration이 아니라고 명확히 말합니다.
