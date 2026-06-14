# Implementation Notes

## MVP 범위

현재 starter는 실제 AI provider 없이도 실행 가능한 **Shell Adapter**를 제공합니다. 이 구조를 먼저 검증한 뒤 Codex Adapter, Claude Adapter, OpenHands Adapter를 추가합니다.

## 구현 순서

1. CLI command layer
2. planning scaffold
3. planning synthesis
4. acceptance compiler
5. freeze gate
6. factory bootstrap
7. shell runner
8. artifact collection
9. Codex adapter
10. GitHub PR loop

## 다음 확장 포인트

| 확장 | 구현 위치 |
|---|---|
| Codex Adapter | `.harness/agents/adapters.yml`, `.harness/bin/runner.mjs` |
| Container Worker | `execution-profiles.yml`의 L1_CONTAINER_WORKER |
| kind Namespace | `execution-profiles.yml`의 L2_KIND_NAMESPACE |
| GitHub Action Runner | `.github/workflows/harness-run.yml` |
| Eval Registry | `meta-harness-platform/evals/` |
| Sanitized Feedback | `.harness/feedback/` |
