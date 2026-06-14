# Dashboard Preview

Dashboard는 dependency-free static preview입니다. 별도 npm package가 아니며 `apps/dashboard/package.json`이 필요하지 않습니다.

repository root에서 실행합니다.

```bash
npm run dashboard:preview
```

브라우저에서 엽니다.

```text
http://localhost:4173
```

server는 `apps/dashboard/preview.mjs`입니다. `apps/dashboard/**` 파일을 serve하고 `apps/dashboard/fixtures`의 sanitized fixture를 읽습니다.

현재 view는 run history, artifact metadata, task policy, manifest state, parsed patch diff output을 포함합니다. 추가 설명은 [Dashboard Preview](../DASHBOARD.md)와 [apps/dashboard/README.md](../../apps/dashboard/README.md)를 참고하세요.
