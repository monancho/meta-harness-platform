# End-to-End Demo

MH-026 demo는 `examples/e2e-demo`에 있습니다. portfolio reviewer와 future agent가 Meta Harness MVP lifecycle을 짧게 확인할 수 있도록 만든 demo입니다.

```text
empty folder -> planning scaffold -> planning synthesis -> acceptance/task compile -> planning freeze -> factory bootstrap -> shell run artifacts
```

network access 없이 local에서 demo를 실행합니다.

```bash
bash ./examples/e2e-demo/run-demo.sh
```

선택적으로 output directory를 지정할 수 있습니다.

```bash
bash ./examples/e2e-demo/run-demo.sh /tmp/mh-e2e-review
```

generated Target Repo는 아래 위치에 생성됩니다.

```text
<output-dir>/target-project
```

demo fixture는 다음을 포함합니다.

- `examples/e2e-demo/demo-answers.json`
- `examples/e2e-demo/expected/planning-docs/`
- `examples/e2e-demo/expected/build-handoff.json`
- `examples/e2e-demo/expected/example-task.BL-001.task.json`
- `examples/e2e-demo/expected/run-artifacts/`

script는 expected planning docs, build handoff, task packet, run artifact shape를 검증합니다. run ID, timestamp, hash, generated patch timestamp 같은 dynamic field는 exact text가 아니라 pattern으로 검증합니다.
