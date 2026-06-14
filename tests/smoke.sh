#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="${TMPDIR:-/tmp}/meta-harness-smoke-$$"
TARGET="$TMP/target-project"
GENERATED_TASK=".harness/tasks/BL-001.task.json"

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
node "$ROOT/bin/mh.mjs" plan compile-tasks --target "$TARGET"
test -f "$TARGET/$GENERATED_TASK"
node --input-type=module - "$TARGET/$GENERATED_TASK" <<'NODE'
import fs from 'node:fs';
const task = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const field of ['objective', 'editableScope', 'forbiddenScope', 'acceptanceCriteria', 'verifyCommands', 'budgets', 'expectedArtifacts']) {
  if (task[field] === undefined) throw new Error(`generated task missing ${field}`);
}
if (!Array.isArray(task.acceptanceCriteria) || task.acceptanceCriteria.length < 1) throw new Error('generated task missing acceptance criteria');
if (!Array.isArray(task.verifyCommands) || task.verifyCommands.length < 1) throw new Error('generated task missing verify commands');
NODE
node "$ROOT/bin/mh.mjs" plan freeze --target "$TARGET" --approved
node "$ROOT/bin/mh.mjs" factory bootstrap --target "$TARGET"
node "$ROOT/bin/mh.mjs" manifest check --target "$TARGET"
node "$ROOT/bin/mh.mjs" run --target "$TARGET" --task "$GENERATED_TASK" --adapter shell

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

BAD_TARGET="$TMP/bad-target-project"
node "$ROOT/bin/mh.mjs" scaffold planning --target "$BAD_TARGET" --project-id bad-task-demo
node "$ROOT/bin/mh.mjs" plan synthesize --target "$BAD_TARGET" --input "$ROOT/examples/demo-answers.json"
node "$ROOT/bin/mh.mjs" plan compile-acceptance --target "$BAD_TARGET"
node --input-type=module - "$BAD_TARGET/.harness/planning/backlog.items.json" <<'NODE'
import fs from 'node:fs';
const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
delete data.backlog[0].acceptanceCriteria;
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
NODE
if node "$ROOT/bin/mh.mjs" plan compile-tasks --target "$BAD_TARGET" >"$TMP/compile-bad.out" 2>"$TMP/compile-bad.err"; then
  echo "[error] compile-tasks with missing acceptance criteria unexpectedly passed" >&2
  exit 1
fi
grep -q "acceptanceCriteria가 없습니다" "$TMP/compile-bad.err"

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

GIT_TARGET="$TMP/git-target-project"
node "$ROOT/bin/mh.mjs" scaffold planning --target "$GIT_TARGET" --project-id smoke-git-demo
node "$ROOT/bin/mh.mjs" plan synthesize --target "$GIT_TARGET" --input "$ROOT/examples/demo-answers.json"
node "$ROOT/bin/mh.mjs" plan compile-acceptance --target "$GIT_TARGET"
node "$ROOT/bin/mh.mjs" plan compile-tasks --target "$GIT_TARGET"
node "$ROOT/bin/mh.mjs" plan freeze --target "$GIT_TARGET" --approved
node "$ROOT/bin/mh.mjs" factory bootstrap --target "$GIT_TARGET"
git -C "$GIT_TARGET" init -q
git -C "$GIT_TARGET" config user.email "smoke@example.invalid"
git -C "$GIT_TARGET" config user.name "Smoke Test"
git -C "$GIT_TARGET" add .
git -C "$GIT_TARGET" commit -q -m "initial target factory"

node "$ROOT/bin/mh.mjs" run --target "$GIT_TARGET" --task "$GENERATED_TASK" --adapter shell --cleanup false
GIT_RUN_RESULT="$(find "$GIT_TARGET/.harness/runs" -mindepth 2 -maxdepth 2 -name run-result.json | sort | tail -n 1)"
GIT_RUN_ID="$(node --input-type=module - "$GIT_RUN_RESULT" <<'NODE'
import fs from 'node:fs';
const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (result.execution?.mode !== 'git-worktree') throw new Error('expected git-worktree execution mode');
console.log(result.runId);
NODE
)"
[[ "$GIT_RUN_ID" =~ ^run-[0-9]{14}-[0-9]{3}-[a-f0-9]{6}-BL-001$ ]]
test -f "$GIT_TARGET/.harness/runs/$GIT_RUN_ID/run-result.json"
test -d "$GIT_TARGET/.harness/tmp/worktrees/$GIT_RUN_ID"
test -f "$GIT_TARGET/.harness/tmp/worktrees/$GIT_RUN_ID/apps/web/src/generated/BL-001.ts"
test ! -f "$GIT_TARGET/apps/web/src/generated/BL-001.ts"
grep -q "diff --git a/apps/web/src/generated/BL-001.ts b/apps/web/src/generated/BL-001.ts" "$GIT_TARGET/.harness/runs/$GIT_RUN_ID/patch.diff"
git -C "$GIT_TARGET" worktree remove --force "$GIT_TARGET/.harness/tmp/worktrees/$GIT_RUN_ID"
test -f "$GIT_TARGET/.harness/runs/$GIT_RUN_ID/run-result.json"

node "$ROOT/bin/mh.mjs" run --target "$GIT_TARGET" --task "$GENERATED_TASK" --adapter shell
GIT_CLEAN_RESULT="$(find "$GIT_TARGET/.harness/runs" -mindepth 2 -maxdepth 2 -name run-result.json ! -path "$GIT_TARGET/.harness/runs/$GIT_RUN_ID/run-result.json" | sort | tail -n 1)"
GIT_CLEAN_RUN_ID="$(node --input-type=module - "$GIT_CLEAN_RESULT" <<'NODE'
import fs from 'node:fs';
const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (result.execution?.mode !== 'git-worktree') throw new Error('expected git-worktree execution mode');
console.log(result.runId);
NODE
)"
[[ "$GIT_CLEAN_RUN_ID" =~ ^run-[0-9]{14}-[0-9]{3}-[a-f0-9]{6}-BL-001$ ]]
test "$GIT_CLEAN_RUN_ID" != "$GIT_RUN_ID"
test -f "$GIT_TARGET/.harness/runs/$GIT_CLEAN_RUN_ID/run-result.json"
test ! -e "$GIT_TARGET/.harness/tmp/worktrees/$GIT_CLEAN_RUN_ID"

echo "[ok] smoke test passed"
echo "Generated target: $TARGET"
