#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="${TMPDIR:-/tmp}/meta-harness-smoke-$$"
TARGET="$TMP/target-project"

rm -rf "$TMP"
mkdir -p "$TMP"

node "$ROOT/bin/mh.mjs" doctor
node "$ROOT/bin/mh.mjs" scaffold planning --target "$TARGET" --project-id smoke-demo

if node "$ROOT/bin/mh.mjs" factory bootstrap --target "$TARGET" >"$TMP/bootstrap-before-freeze.out" 2>"$TMP/bootstrap-before-freeze.err"; then
  echo "[error] factory bootstrap before planning freeze unexpectedly passed" >&2
  exit 1
fi
grep -q "factory bootstrap requires phase=planning-frozen" "$TMP/bootstrap-before-freeze.err"

if node "$ROOT/bin/mh.mjs" run --target "$TARGET" --task .harness/tasks/example.task.json --adapter shell >"$TMP/run-before-ready.out" 2>"$TMP/run-before-ready.err"; then
  echo "[error] run before factory-ready unexpectedly passed" >&2
  exit 1
fi
grep -q "run requires phase=factory-ready|runnable" "$TMP/run-before-ready.err"

node "$ROOT/bin/mh.mjs" plan synthesize --target "$TARGET" --input "$ROOT/examples/demo-answers.json"
node "$ROOT/bin/mh.mjs" plan compile-acceptance --target "$TARGET"
node "$ROOT/bin/mh.mjs" plan freeze --target "$TARGET" --approved
node "$ROOT/bin/mh.mjs" factory bootstrap --target "$TARGET"
node "$ROOT/bin/mh.mjs" manifest check --target "$TARGET"
node "$ROOT/bin/mh.mjs" run --target "$TARGET" --task .harness/tasks/example.task.json --adapter shell

grep -q "phase: runnable" "$TARGET/.harness/state.yml"
grep -Eq "lastRunResultHash: sha256:[a-f0-9]{64}" "$TARGET/.harness/state.yml"

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
node --input-type=module - "$TARGET/.harness/manifest.lock" <<'NODE'
import fs from 'node:fs';
const manifest = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const files = new Map(manifest.managedFiles.map(item => [item.path, item]));
if (!manifest.generator?.version) throw new Error('manifest missing generator.version');
if (!manifest.source?.buildHandoffHash?.startsWith('sha256:')) throw new Error('manifest missing buildHandoffHash');
if (!manifest.answers?.planningBaselineHash?.startsWith('sha256:')) throw new Error('manifest missing answers hash');
if (files.get('AGENTS.md')?.ownership !== 'shared') throw new Error('AGENTS.md must be shared');
if (files.get('.github/workflows/ci.yml')?.ownership !== 'shared') throw new Error('GitHub workflow must be shared');
if (files.get('infra/caddy/Caddyfile')?.mergeStrategy !== 'propose-only') throw new Error('infra/caddy must be propose-only');
for (const item of manifest.managedFiles) {
  if (/^\.env(?:\.|$)|secret|token|\.pem$/i.test(item.path)) throw new Error(`secret-like path included: ${item.path}`);
  if (!item.conflictPolicy) throw new Error(`missing conflictPolicy: ${item.path}`);
}
NODE
printf '\n# drift\n' >> "$TARGET/AGENTS.md"
if node "$ROOT/bin/mh.mjs" manifest check --target "$TARGET" >"$TMP/manifest-drift.out" 2>"$TMP/manifest-drift.err"; then
  echo "[error] manifest check did not detect managed file drift" >&2
  exit 1
fi
grep -q "\[changed\] AGENTS.md" "$TMP/manifest-drift.err"
test -d "$TARGET/.harness/runs"
RUN_DIR="$(find "$TARGET/.harness/runs" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
test -f "$RUN_DIR/patch.diff"
test -f "$RUN_DIR/run-result.json"
test -f "$RUN_DIR/summary.md"

echo "[ok] smoke test passed"
echo "Generated target: $TARGET"
