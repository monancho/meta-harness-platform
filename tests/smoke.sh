#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="${TMPDIR:-/tmp}/meta-harness-smoke-$$"
TARGET="$TMP/target-project"

rm -rf "$TMP"
mkdir -p "$TMP"

node "$ROOT/bin/mh.mjs" doctor
node "$ROOT/bin/mh.mjs" scaffold planning --target "$TARGET" --project-id smoke-demo
node "$ROOT/bin/mh.mjs" plan synthesize --target "$TARGET" --input "$ROOT/examples/demo-answers.json"
node "$ROOT/bin/mh.mjs" plan compile-acceptance --target "$TARGET"
node "$ROOT/bin/mh.mjs" plan freeze --target "$TARGET" --approved
node "$ROOT/bin/mh.mjs" factory bootstrap --target "$TARGET"
node "$ROOT/bin/mh.mjs" run --target "$TARGET" --task .harness/tasks/example.task.json --adapter shell

INVALID_TASK="$TMP/invalid.task.json"
cat > "$INVALID_TASK" <<'JSON'
{
  "schemaVersion": "1.0.0",
  "taskId": "BROKEN-001"
}
JSON
if node "$ROOT/bin/mh.mjs" run --target "$TARGET" --task "$INVALID_TASK" --adapter shell >"$TMP/invalid.out" 2>"$TMP/invalid.err"; then
  echo "[error] invalid task packet unexpectedly passed" >&2
  exit 1
fi
grep -q "MH_SCHEMA_VALIDATION_FAILED" "$TMP/invalid.err"

test -f "$TARGET/.harness/factory.yml"
test -f "$TARGET/.harness/manifest.lock"
test -d "$TARGET/.harness/runs"
RUN_DIR="$(find "$TARGET/.harness/runs" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
test -f "$RUN_DIR/patch.diff"
test -f "$RUN_DIR/run-result.json"
test -f "$RUN_DIR/summary.md"

echo "[ok] smoke test passed"
echo "Generated target: $TARGET"
