#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="${TMPDIR:-/tmp}/meta-harness-smoke-$$"
TARGET="$TMP/target-project"
GENERATED_TASK=".harness/tasks/BL-001.task.json"

rm -rf "$TMP"
mkdir -p "$TMP"

node "$ROOT/bin/mh.mjs" doctor
node "$ROOT/tests/dashboard-fixture-loader.test.mjs"
node "$ROOT/tests/dashboard-run-history.test.mjs"
node "$ROOT/tests/dashboard-patch-diff.test.mjs"
node "$ROOT/tests/managed-blocks.test.mjs"
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
grep -q "defaultAdapter: shell" "$TARGET/.harness/agents/adapters.yml"
grep -q "lifecycle: prepare-execute-collectArtifacts-summarize" "$TARGET/.harness/agents/adapters.yml"
grep -q "implementation: builtin:shell" "$TARGET/.harness/agents/adapters.yml"
grep -q "implementation: builtin:codex" "$TARGET/.harness/agents/adapters.yml"
grep -q "status: available-if-codex-cli-installed" "$TARGET/.harness/agents/adapters.yml"
grep -q "status: disabled-placeholder" "$TARGET/.harness/agents/adapters.yml"
node "$ROOT/bin/mh.mjs" run --target "$TARGET" --task "$GENERATED_TASK" --adapter shell

if MH_CODEX_BINARY="$TMP/missing-codex" node "$ROOT/bin/mh.mjs" run --target "$TARGET" --task "$GENERATED_TASK" --adapter codex >"$TMP/codex-missing.out" 2>"$TMP/codex-missing.err"; then
  echo "[error] codex adapter unexpectedly passed with a missing codex binary" >&2
  exit 1
fi
CODEX_MISSING_RESULT="$(find "$TARGET/.harness/runs" -mindepth 2 -maxdepth 2 -name run-result.json | sort | tail -n 1)"
node --input-type=module - "$CODEX_MISSING_RESULT" <<'NODE'
import fs from 'node:fs';
const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (result.status !== 'failed') throw new Error('expected failed codex missing-binary result');
if (result.reasonCode !== 'MH_CODEX_BINARY_NOT_FOUND') throw new Error(`unexpected reasonCode: ${result.reasonCode}`);
NODE

grep -q "phase: runnable" "$TARGET/.harness/state.yml"
grep -Eq "lastRunResultHash: sha256:[a-f0-9]{64}" "$TARGET/.harness/state.yml"

BAD_SCOPE_TASK="$TARGET/.harness/tasks/SEC-BAD-SCOPE.task.json"
cat > "$BAD_SCOPE_TASK" <<'JSON'
{
  "schemaVersion": "1.0.0",
  "taskId": "SEC-BAD-SCOPE",
  "taskType": "implementation",
  "priority": "P1",
  "title": "Invalid editable scope",
  "objective": "Exercise security preflight for invalid scope patterns.",
  "editableScope": ["../outside/**"],
  "forbiddenScope": [".env*", "infra/production/**"],
  "acceptanceCriteria": [{ "id": "SEC-AC-001", "text": "Security preflight fails." }],
  "verifyCommands": ["node -e \"console.log('should not run')\""],
  "commands": { "verify": ["node -e \"console.log('should not run')\""] },
  "budgets": { "maxRuntimeMinutes": 20, "maxChangedFiles": 20, "maxPatchLines": 800 },
  "expectedArtifacts": ["patch.diff", "run-result.json", "summary.md"]
}
JSON
if node "$ROOT/bin/mh.mjs" run --target "$TARGET" --task .harness/tasks/SEC-BAD-SCOPE.task.json --adapter shell >"$TMP/security-bad-scope.out" 2>"$TMP/security-bad-scope.err"; then
  echo "[error] invalid security scope unexpectedly passed" >&2
  exit 1
fi
BAD_SCOPE_RESULT="$(find "$TARGET/.harness/runs" -mindepth 2 -maxdepth 2 -name run-result.json | sort | tail -n 1)"
node --input-type=module - "$BAD_SCOPE_RESULT" <<'NODE'
import fs from 'node:fs';
const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (result.status !== 'failed') throw new Error('expected failed security result');
if (result.failureCategory !== 'security') throw new Error(`unexpected failureCategory: ${result.failureCategory}`);
if (result.reasonCode !== 'MH_SECURITY_INVALID_SCOPE') throw new Error(`unexpected reasonCode: ${result.reasonCode}`);
NODE

DENIED_COMMAND_TASK="$TARGET/.harness/tasks/SEC-DENIED-COMMAND.task.json"
cat > "$DENIED_COMMAND_TASK" <<'JSON'
{
  "schemaVersion": "1.0.0",
  "taskId": "SEC-DENIED-COMMAND",
  "taskType": "implementation",
  "priority": "P1",
  "title": "Denied command",
  "objective": "Exercise command deny policy.",
  "editableScope": ["apps/**"],
  "forbiddenScope": [".env*", "infra/production/**"],
  "acceptanceCriteria": [{ "id": "SEC-AC-002", "text": "Denied command is blocked." }],
  "verifyCommands": ["git push origin main"],
  "commands": { "verify": ["git push origin main"] },
  "budgets": { "maxRuntimeMinutes": 20, "maxChangedFiles": 20, "maxPatchLines": 800 },
  "expectedArtifacts": ["patch.diff", "run-result.json", "summary.md"]
}
JSON
if node "$ROOT/bin/mh.mjs" run --target "$TARGET" --task .harness/tasks/SEC-DENIED-COMMAND.task.json --adapter shell >"$TMP/security-denied-command.out" 2>"$TMP/security-denied-command.err"; then
  echo "[error] denied command unexpectedly passed" >&2
  exit 1
fi
DENIED_COMMAND_RESULT="$(find "$TARGET/.harness/runs" -mindepth 2 -maxdepth 2 -name run-result.json | sort | tail -n 1)"
node --input-type=module - "$DENIED_COMMAND_RESULT" <<'NODE'
import fs from 'node:fs';
const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (result.status !== 'failed') throw new Error('expected failed command policy result');
if (result.failureCategory !== 'security') throw new Error(`unexpected failureCategory: ${result.failureCategory}`);
if (result.reasonCode !== 'MH_SECURITY_COMMAND_DENIED') throw new Error(`unexpected reasonCode: ${result.reasonCode}`);
NODE

ENV_FORBIDDEN_TASK="$TARGET/.harness/tasks/SEC-ENV-FORBIDDEN.task.json"
cat > "$ENV_FORBIDDEN_TASK" <<'JSON'
{
  "schemaVersion": "1.0.0",
  "taskId": "SEC-ENV-FORBIDDEN",
  "taskType": "implementation",
  "priority": "P1",
  "title": "Forbidden env file",
  "objective": "Exercise forbidden .env changed-file detection.",
  "editableScope": ["**"],
  "forbiddenScope": [".env*", "infra/production/**"],
  "acceptanceCriteria": [{ "id": "SEC-AC-004", "text": "Env file changes are blocked." }],
  "verifyCommands": ["node -e \"import fs from 'node:fs'; fs.writeFileSync('.env.local','placeholder=true'); console.log('mutated env file')\""],
  "commands": { "verify": ["node -e \"import fs from 'node:fs'; fs.writeFileSync('.env.local','placeholder=true'); console.log('mutated env file')\""] },
  "budgets": { "maxRuntimeMinutes": 20, "maxChangedFiles": 20, "maxPatchLines": 800 },
  "expectedArtifacts": ["patch.diff", "run-result.json", "summary.md"]
}
JSON
if node "$ROOT/bin/mh.mjs" run --target "$TARGET" --task .harness/tasks/SEC-ENV-FORBIDDEN.task.json --adapter shell >"$TMP/security-env-forbidden.out" 2>"$TMP/security-env-forbidden.err"; then
  echo "[error] .env forbidden change unexpectedly passed" >&2
  exit 1
fi
ENV_FORBIDDEN_RESULT="$(find "$TARGET/.harness/runs" -mindepth 2 -maxdepth 2 -name run-result.json | sort | tail -n 1)"
node --input-type=module - "$ENV_FORBIDDEN_RESULT" <<'NODE'
import fs from 'node:fs';
const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (result.status !== 'failed') throw new Error('expected failed .env forbidden result');
if (result.failureCategory !== 'security') throw new Error(`unexpected failureCategory: ${result.failureCategory}`);
if (result.reasonCode !== 'MH_SECURITY_FORBIDDEN_CHANGED_FILE') throw new Error(`unexpected reasonCode: ${result.reasonCode}`);
NODE

DEPLOY_PROD_TASK="$TARGET/.harness/tasks/SEC-DEPLOY-PROD.task.json"
cat > "$DEPLOY_PROD_TASK" <<'JSON'
{
  "schemaVersion": "1.0.0",
  "taskId": "SEC-DEPLOY-PROD",
  "taskType": "implementation",
  "priority": "P1",
  "title": "Forbidden deploy-prod workflow",
  "objective": "Exercise deploy-prod workflow changed-file detection.",
  "editableScope": ["**"],
  "forbiddenScope": [".env*", ".github/workflows/deploy-prod.yml"],
  "acceptanceCriteria": [{ "id": "SEC-AC-005", "text": "deploy-prod workflow changes are blocked." }],
  "verifyCommands": ["node -e \"import fs from 'node:fs'; fs.mkdirSync('.github/workflows',{recursive:true}); fs.writeFileSync('.github/workflows/deploy-prod.yml','name: deploy-prod'); console.log('mutated deploy workflow')\""],
  "commands": { "verify": ["node -e \"import fs from 'node:fs'; fs.mkdirSync('.github/workflows',{recursive:true}); fs.writeFileSync('.github/workflows/deploy-prod.yml','name: deploy-prod'); console.log('mutated deploy workflow')\""] },
  "budgets": { "maxRuntimeMinutes": 20, "maxChangedFiles": 20, "maxPatchLines": 800 },
  "expectedArtifacts": ["patch.diff", "run-result.json", "summary.md"]
}
JSON
if node "$ROOT/bin/mh.mjs" run --target "$TARGET" --task .harness/tasks/SEC-DEPLOY-PROD.task.json --adapter shell >"$TMP/security-deploy-prod.out" 2>"$TMP/security-deploy-prod.err"; then
  echo "[error] deploy-prod forbidden change unexpectedly passed" >&2
  exit 1
fi
DEPLOY_PROD_RESULT="$(find "$TARGET/.harness/runs" -mindepth 2 -maxdepth 2 -name run-result.json | sort | tail -n 1)"
node --input-type=module - "$DEPLOY_PROD_RESULT" <<'NODE'
import fs from 'node:fs';
const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (result.status !== 'failed') throw new Error('expected failed deploy-prod forbidden result');
if (result.failureCategory !== 'security') throw new Error(`unexpected failureCategory: ${result.failureCategory}`);
if (result.reasonCode !== 'MH_SECURITY_FORBIDDEN_CHANGED_FILE') throw new Error(`unexpected reasonCode: ${result.reasonCode}`);
NODE

SECRET_PATTERN_TASK="$TARGET/.harness/tasks/SEC-SECRET-PATTERN.task.json"
cat > "$SECRET_PATTERN_TASK" <<'JSON'
{
  "schemaVersion": "1.0.0",
  "taskId": "SEC-SECRET-PATTERN",
  "taskType": "implementation",
  "priority": "P1",
  "title": "Secret pattern command",
  "objective": "Exercise secret-like command content detection.",
  "editableScope": ["apps/**"],
  "forbiddenScope": [".env*", "infra/production/**"],
  "acceptanceCriteria": [{ "id": "SEC-AC-006", "text": "Secret-like command content is blocked." }],
  "verifyCommands": ["node -e \"const API_KEY='aaaaaaaaaaaa'; console.log(API_KEY.length)\""],
  "commands": { "verify": ["node -e \"const API_KEY='aaaaaaaaaaaa'; console.log(API_KEY.length)\""] },
  "budgets": { "maxRuntimeMinutes": 20, "maxChangedFiles": 20, "maxPatchLines": 800 },
  "expectedArtifacts": ["patch.diff", "run-result.json", "summary.md"]
}
JSON
if node "$ROOT/bin/mh.mjs" run --target "$TARGET" --task .harness/tasks/SEC-SECRET-PATTERN.task.json --adapter shell >"$TMP/security-secret-pattern.out" 2>"$TMP/security-secret-pattern.err"; then
  echo "[error] secret-like command unexpectedly passed" >&2
  exit 1
fi
SECRET_PATTERN_RESULT="$(find "$TARGET/.harness/runs" -mindepth 2 -maxdepth 2 -name run-result.json | sort | tail -n 1)"
node --input-type=module - "$SECRET_PATTERN_RESULT" <<'NODE'
import fs from 'node:fs';
const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (result.status !== 'failed') throw new Error('expected failed secret-pattern result');
if (result.failureCategory !== 'security') throw new Error(`unexpected failureCategory: ${result.failureCategory}`);
if (result.reasonCode !== 'MH_SECURITY_SECRET_PATTERN') throw new Error(`unexpected reasonCode: ${result.reasonCode}`);
NODE

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
if (files.get('AGENTS.md')?.mergeStrategy !== 'managed-blocks') throw new Error('AGENTS.md must use managed-blocks');
if (!files.get('AGENTS.md')?.managedBlocks?.some(block => block.id === 'target-factory-instructions')) throw new Error('AGENTS.md missing managed block metadata');
if (files.get('.github/workflows/ci.yml')?.ownership !== 'shared') throw new Error('GitHub workflow must be shared');
if (!files.get('.github/workflows/ci.yml')?.managedBlocks?.some(block => block.id === 'ci-workflow')) throw new Error('GitHub workflow missing managed block metadata');
if (files.get('infra/caddy/Caddyfile')?.mergeStrategy !== 'propose-only') throw new Error('infra/caddy must be propose-only');
for (const item of manifest.managedFiles) {
  if (/^\.env(?:\.|$)|secret|token|\.pem$/i.test(item.path)) throw new Error(`secret-like path included: ${item.path}`);
  if (!item.conflictPolicy) throw new Error(`missing conflictPolicy: ${item.path}`);
}
NODE
printf '\n# drift\n' >> "$TARGET/AGENTS.md"
node --input-type=module - "$TARGET" "$TMP/upgrade-managed-before.json" <<'NODE'
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const target = process.argv[2];
const out = process.argv[3];
const manifest = JSON.parse(fs.readFileSync(path.join(target, '.harness/manifest.lock'), 'utf8'));
const hashes = {};
for (const item of manifest.managedFiles) {
  const filePath = path.join(target, item.path);
  hashes[item.path] = fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : null;
}
fs.writeFileSync(out, JSON.stringify(hashes, null, 2) + '\n');
NODE
node "$ROOT/bin/mh.mjs" factory upgrade --target "$TARGET" --dry-run
test -f "$TARGET/.harness/upgrades/upgrade-report.json"
test -f "$TARGET/.harness/upgrades/upgrade-summary.md"
node --input-type=module - "$TARGET" "$TMP/upgrade-managed-before.json" <<'NODE'
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const target = process.argv[2];
const before = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
for (const [rel, expected] of Object.entries(before)) {
  const filePath = path.join(target, rel);
  const actual = fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : null;
  if (actual !== expected) throw new Error(`dry-run modified managed file: ${rel}`);
}
NODE
node --input-type=module - "$TARGET/.harness/upgrades/upgrade-report.json" <<'NODE'
import fs from 'node:fs';
const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const byPath = new Map(report.files.map(item => [item.path, item]));
if (report.mode !== 'dry-run') throw new Error('expected dry-run mode');
if (byPath.get('AGENTS.md')?.classification !== 'ignored') throw new Error('expected AGENTS.md ignored because drift is outside managed blocks');
if (byPath.get('AGENTS.md')?.managedBlocks?.status !== 'unchanged') throw new Error('expected AGENTS.md managed blocks unchanged');
if (byPath.get('package.json')?.classification !== 'ignored') throw new Error('expected package.json ignored');
for (const key of ['safe-auto', 'changed-by-user', 'conflict', 'propose-only', 'ignored']) {
  if (typeof report.counts[key] !== 'number') throw new Error(`missing count for ${key}`);
}
NODE
grep -q "ignored: AGENTS.md" "$TARGET/.harness/upgrades/upgrade-summary.md"
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

POST_FORBIDDEN_TASK="$GIT_TARGET/.harness/tasks/SEC-POST-FORBIDDEN.task.json"
cat > "$POST_FORBIDDEN_TASK" <<'JSON'
{
  "schemaVersion": "1.0.0",
  "taskId": "SEC-POST-FORBIDDEN",
  "taskType": "implementation",
  "priority": "P1",
  "title": "Forbidden post-run change",
  "objective": "Exercise post-execution forbidden changed-file detection.",
  "editableScope": ["**"],
  "forbiddenScope": [".env*", "infra/production/**"],
  "acceptanceCriteria": [{ "id": "SEC-AC-003", "text": "Forbidden changed file fails the run." }],
  "verifyCommands": ["node -e \"import fs from 'node:fs'; fs.mkdirSync('infra/production',{recursive:true}); fs.writeFileSync('infra/production/blocked.txt','blocked'); console.log('mutated forbidden path')\""],
  "commands": { "verify": ["node -e \"import fs from 'node:fs'; fs.mkdirSync('infra/production',{recursive:true}); fs.writeFileSync('infra/production/blocked.txt','blocked'); console.log('mutated forbidden path')\""] },
  "budgets": { "maxRuntimeMinutes": 20, "maxChangedFiles": 20, "maxPatchLines": 800 },
  "expectedArtifacts": ["patch.diff", "run-result.json", "summary.md"]
}
JSON
if node "$ROOT/bin/mh.mjs" run --target "$GIT_TARGET" --task .harness/tasks/SEC-POST-FORBIDDEN.task.json --adapter shell >"$TMP/security-post-forbidden.out" 2>"$TMP/security-post-forbidden.err"; then
  echo "[error] forbidden changed file unexpectedly passed" >&2
  exit 1
fi
POST_FORBIDDEN_RESULT="$(find "$GIT_TARGET/.harness/runs" -mindepth 2 -maxdepth 2 -name run-result.json | sort | tail -n 1)"
node --input-type=module - "$POST_FORBIDDEN_RESULT" <<'NODE'
import fs from 'node:fs';
const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (result.status !== 'failed') throw new Error('expected failed forbidden changed-file result');
if (result.reasonCode !== 'MH_SECURITY_FORBIDDEN_CHANGED_FILE') throw new Error(`unexpected reasonCode: ${result.reasonCode}`);
NODE

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

node "$ROOT/bin/mh.mjs" github pr --target "$GIT_TARGET" --run "$GIT_CLEAN_RUN_ID" >"$TMP/github-pr-dry-run.out"
test -f "$GIT_TARGET/.harness/runs/$GIT_CLEAN_RUN_ID/pr-body.md"
grep -q "# Harness Run PR" "$TMP/github-pr-dry-run.out"
grep -q "Run ID: $GIT_CLEAN_RUN_ID" "$GIT_TARGET/.harness/runs/$GIT_CLEAN_RUN_ID/pr-body.md"
grep -q "dry run only" "$TMP/github-pr-dry-run.out"

if MH_GH_BINARY="$TMP/missing-gh" node "$ROOT/bin/mh.mjs" github pr --target "$GIT_TARGET" --run "$GIT_CLEAN_RUN_ID" --create >"$TMP/github-pr-missing-gh.out" 2>"$TMP/github-pr-missing-gh.err"; then
  echo "[error] github pr unexpectedly passed with a missing gh binary" >&2
  exit 1
fi
grep -q "gh CLI not found" "$TMP/github-pr-missing-gh.err"
grep -q "rerun without --create" "$TMP/github-pr-missing-gh.err"

FAKE_CODEX="$TMP/fake-codex"
cat > "$FAKE_CODEX" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
if [ "${1:-}" != "exec" ]; then
  echo "unexpected codex command: $*" >&2
  exit 9
fi
PROMPT="$(cat)"
case "$PROMPT" in
  *"Meta Harness Codex Adapter Prompt"*".harness/runs/<run-id>"*) ;;
  *) echo "prompt missing expected AGENTS/task content" >&2; exit 8 ;;
esac
mkdir -p docs
printf 'codex adapter smoke\n' > docs/codex-adapter-smoke.md
echo "fake codex ok"
SH
chmod +x "$FAKE_CODEX"

MH_CODEX_BINARY="$FAKE_CODEX" node "$ROOT/bin/mh.mjs" run --target "$GIT_TARGET" --task "$GENERATED_TASK" --adapter codex
CODEX_RESULT_ONE="$(find "$GIT_TARGET/.harness/runs" -mindepth 2 -maxdepth 2 -name run-result.json | sort | tail -n 1)"
CODEX_RUN_ONE="$(node --input-type=module - "$CODEX_RESULT_ONE" <<'NODE'
import fs from 'node:fs';
const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (result.status !== 'passed') throw new Error(`expected passed codex result, got ${result.status}`);
if (result.adapter !== 'codex') throw new Error(`unexpected adapter: ${result.adapter}`);
if (!result.artifacts.includes('codex-prompt.md')) throw new Error('missing codex-prompt.md artifact');
if (!result.artifacts.includes('codex-output.log')) throw new Error('missing codex-output.log artifact');
if (!result.changedFiles.includes('docs/codex-adapter-smoke.md')) throw new Error(`missing changed file: ${result.changedFiles.join(',')}`);
console.log(result.runId);
NODE
)"
grep -q "diff --git a/docs/codex-adapter-smoke.md b/docs/codex-adapter-smoke.md" "$GIT_TARGET/.harness/runs/$CODEX_RUN_ONE/patch.diff"
test -f "$GIT_TARGET/.harness/runs/$CODEX_RUN_ONE/codex-prompt.md"
test -f "$GIT_TARGET/.harness/runs/$CODEX_RUN_ONE/codex-output.log"

MH_CODEX_BINARY="$FAKE_CODEX" node "$ROOT/bin/mh.mjs" run --target "$GIT_TARGET" --task "$GENERATED_TASK" --adapter codex
CODEX_RESULT_TWO="$(find "$GIT_TARGET/.harness/runs" -mindepth 2 -maxdepth 2 -name run-result.json ! -path "$CODEX_RESULT_ONE" | sort | tail -n 1)"
CODEX_RUN_TWO="$(node --input-type=module - "$CODEX_RESULT_TWO" <<'NODE'
import fs from 'node:fs';
const result = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (result.status !== 'passed') throw new Error(`expected passed codex result, got ${result.status}`);
console.log(result.runId);
NODE
)"
cmp "$GIT_TARGET/.harness/runs/$CODEX_RUN_ONE/codex-prompt.md" "$GIT_TARGET/.harness/runs/$CODEX_RUN_TWO/codex-prompt.md"

echo "[ok] smoke test passed"
echo "Generated target: $TARGET"
