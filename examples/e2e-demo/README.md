# End-to-End Demo

This demo proves the MVP path from an empty folder to planning artifacts, a frozen Target Repo factory, and local run artifacts.

Run it without network access:

```bash
bash ./examples/e2e-demo/run-demo.sh
```

The script writes to `${TMPDIR:-/tmp}/meta-harness-e2e-demo` by default. Pass a directory to keep a named copy:

```bash
bash ./examples/e2e-demo/run-demo.sh /tmp/mh-e2e-review
```

Generated target path:

```text
<output-dir>/target-project
```

The demo uses only the local `node ./bin/mh.mjs` CLI and the checked-in `demo-answers.json` fixture.
