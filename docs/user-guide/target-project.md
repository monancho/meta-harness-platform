# Target Project Creation

Target Project creation follows a planning-first lifecycle. A full factory is not bootstrapped until planning has been frozen.

## Typical Flow

```bash
node ./bin/mh.mjs scaffold planning --target /tmp/my-target --project-id my-target
node ./bin/mh.mjs plan synthesize --target /tmp/my-target --input ./examples/demo-answers.json
node ./bin/mh.mjs plan compile-acceptance --target /tmp/my-target
node ./bin/mh.mjs plan freeze --target /tmp/my-target --approved
node ./bin/mh.mjs factory bootstrap --target /tmp/my-target
node ./bin/mh.mjs manifest check --target /tmp/my-target
```

The generated Target Repo owns its planning files, application folders, infrastructure folders, run artifacts, and Target-level `AGENTS.md`.

## Offline Demo

Use the packaged demo when you want a deterministic proof of the full lifecycle:

```bash
npm run demo:e2e
```

Detailed reference: [End-to-End Demo](../E2E_DEMO.md).

