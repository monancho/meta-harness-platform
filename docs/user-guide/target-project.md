# Target Project 생성

Target Project 생성은 planning-first lifecycle을 따릅니다. planning이 freeze되기 전에는 full factory를 bootstrap하지 않습니다.

## 일반 흐름

```bash
node ./bin/mh.mjs scaffold planning --target /tmp/my-target --project-id my-target
node ./bin/mh.mjs plan synthesize --target /tmp/my-target --input ./examples/demo-answers.json
node ./bin/mh.mjs plan compile-acceptance --target /tmp/my-target
node ./bin/mh.mjs plan freeze --target /tmp/my-target --approved
node ./bin/mh.mjs factory bootstrap --target /tmp/my-target
node ./bin/mh.mjs manifest check --target /tmp/my-target
```

생성된 Target Repo는 자기 planning file, application folder, infrastructure folder, run artifact, Target-level `AGENTS.md`를 소유합니다.

## 오프라인 Demo

전체 lifecycle을 결정적으로 확인하려면 packaged demo를 사용합니다.

```bash
npm run demo:e2e
```

상세 참고: [End-to-End Demo](../E2E_DEMO.md).
