# 시작하기

Meta Harness Platform은 Meta repo입니다. Target Project Factory를 생성하고 검증하지만, target project의 raw planning data, code, log, artifact는 소유하지 않습니다.

## 준비물

- Node.js 20 이상
- Git
- Bash
- local doctor check용 Make

## 첫 확인

repository root에서 실행합니다.

```bash
npm run doctor
npm run verify
npm run smoke
```

`npm run verify`는 agent verification script를 실행하고 smoke path를 포함합니다. smoke suite만 따로 확인하려면 `npm run smoke`를 사용합니다.

## 먼저 읽을 문서

- [Target Project 생성](target-project.md)
- [Agent Task 실행](agent-task-run.md)
- [Dashboard Preview](dashboard-preview.md)
- [Troubleshooting](troubleshooting.md)
- [Architecture](../developer-guide/architecture.md)
