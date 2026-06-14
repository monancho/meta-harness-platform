# Testing

root `package.json` script를 source of truth로 사용합니다.

## 필수 확인

```bash
npm run doctor
npm run verify
npm run smoke
```

## 기능 확인

```bash
npm run dashboard:preview
npm run demo:e2e
```

`npm run dashboard:preview`는 장시간 실행되는 local server를 시작합니다. verification harness에서는 server를 시작하고 URL 출력을 기다린 뒤 종료해도 됩니다.

## Guard Diff

```bash
node ./scripts/agent/guard-diff.mjs
```

task scope나 release cleanup scope 안에서 작업할 때 forbidden path change를 잡기 위해 guard-diff를 사용합니다.

변경을 통과시키기 위해 smoke test를 약화하지 않습니다. 구현을 고치거나 실제 한계를 문서화합니다.
