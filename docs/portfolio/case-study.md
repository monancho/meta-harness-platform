# Portfolio Case Study 초안

## 문제

AI-assisted software 작업은 종종 구조 없는 chat으로 진행됩니다. scope를 audit하고, run을 재현하고, security boundary를 강제하고, 무엇이 왜 생성됐는지 설명하기 어렵습니다.

## 해결

Meta Harness Platform은 agent 작업을 repo-resident project factory로 바꿉니다. Target Repo는 planning contract, task packet, scoped execution, verification command, security gate, run artifact를 받습니다.

## 핵심 포인트

- Planning-first lifecycle과 state machine
- editable/forbidden scope를 가진 task packet contract
- artifact를 보존하는 local git worktree runner
- review surface를 위한 dependency-free dashboard preview
- raw project data 보관을 피하는 sanitized eval/signal skeleton

## Demo Path

```bash
npm run doctor
npm run demo:e2e
npm run smoke
npm run dashboard:preview
```

## Positioning

이 프로젝트는 완전 자율 개발자를 주장하기보다 governance, reproducibility, practical agent boundary를 보여주는 DevTool portfolio project입니다.
