# End-to-End Demo

The MH-026 demo is in `examples/e2e-demo`. It is meant for portfolio reviewers and future agents who need a compact proof of the Meta Harness MVP lifecycle:

```text
empty folder -> planning scaffold -> planning synthesis -> acceptance/task compile -> planning freeze -> factory bootstrap -> shell run artifacts
```

Run the demo locally without network access:

```bash
bash ./examples/e2e-demo/run-demo.sh
```

Optional output directory:

```bash
bash ./examples/e2e-demo/run-demo.sh /tmp/mh-e2e-review
```

The generated Target Repo is written to:

```text
<output-dir>/target-project
```

The demo fixture includes:

- `examples/e2e-demo/demo-answers.json`
- `examples/e2e-demo/expected/planning-docs/`
- `examples/e2e-demo/expected/build-handoff.json`
- `examples/e2e-demo/expected/example-task.BL-001.task.json`
- `examples/e2e-demo/expected/run-artifacts/`

The script validates the expected planning docs, build handoff, task packet, and run artifact shape. Dynamic fields such as run ID, timestamps, hashes, and generated patch timestamps are checked by pattern instead of exact text.
