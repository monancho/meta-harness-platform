#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${1:-${TMPDIR:-/tmp}/meta-harness-e2e-demo}"
TARGET="$OUT/target-project"
ANSWERS="$ROOT/examples/e2e-demo/demo-answers.json"
EXPECTED="$ROOT/examples/e2e-demo/expected"
TASK=".harness/tasks/BL-001.task.json"

rm -rf "$OUT"
mkdir -p "$OUT"

node "$ROOT/bin/mh.mjs" scaffold planning --target "$TARGET" --project-id offline-portfolio-task-board
node "$ROOT/bin/mh.mjs" plan synthesize --target "$TARGET" --input "$ANSWERS"
node "$ROOT/bin/mh.mjs" plan compile-acceptance --target "$TARGET"
node "$ROOT/bin/mh.mjs" plan compile-tasks --target "$TARGET"
node "$ROOT/bin/mh.mjs" plan freeze --target "$TARGET" --approved
node "$ROOT/bin/mh.mjs" factory bootstrap --target "$TARGET"
node "$ROOT/bin/mh.mjs" run --target "$TARGET" --task "$TASK" --adapter shell

RUN_RESULT="$(find "$TARGET/.harness/runs" -mindepth 2 -maxdepth 2 -name run-result.json | sort | tail -n 1)"
RUN_DIR="$(dirname "$RUN_RESULT")"

node --input-type=module - "$TARGET" "$EXPECTED" "$RUN_RESULT" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';

const [target, expected, runResultPath] = process.argv.slice(2);

function read(rel) {
  return fs.readFileSync(path.join(target, rel), 'utf8').trimEnd();
}

function readExpected(rel) {
  return fs.readFileSync(path.join(expected, rel), 'utf8').trimEnd();
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function assertEqual(actual, expectedValue, label) {
  if (actual !== expectedValue) throw new Error(`${label} did not match expected fixture`);
}

for (const rel of [
  'planning-docs/03_PRD.md',
  'planning-docs/11_ACCEPTANCE_CRITERIA.md',
  'planning-docs/14_BUILD_HANDOFF.md'
]) {
  assertEqual(read(`docs/planning/${path.basename(rel)}`), readExpected(rel), rel);
}

const handoff = readJson(path.join(target, '.harness/planning/build-handoff.json'));
const expectedHandoff = readJson(path.join(expected, 'build-handoff.json'));
assertEqual(JSON.stringify(handoff), JSON.stringify(expectedHandoff), 'build-handoff.json');

const task = readJson(path.join(target, '.harness/tasks/BL-001.task.json'));
const expectedTask = readJson(path.join(expected, 'example-task.BL-001.task.json'));
assertEqual(JSON.stringify(task), JSON.stringify(expectedTask), 'BL-001 task packet');

const result = readJson(runResultPath);
const shape = readJson(path.join(expected, 'run-artifacts/run-result.shape.json'));
if (!new RegExp(shape.runIdPattern).test(result.runId)) throw new Error(`unexpected runId: ${result.runId}`);
for (const key of ['adapter', 'taskId', 'taskType', 'status']) {
  if (result[key] !== shape[key]) throw new Error(`unexpected ${key}: ${result[key]}`);
}
for (const file of shape.changedFiles) {
  if (!result.changedFiles.includes(file)) throw new Error(`missing changed file: ${file}`);
}
for (const artifact of shape.artifactsInclude) {
  if (!result.artifacts.includes(artifact)) throw new Error(`missing artifact: ${artifact}`);
}
if (result.execution?.profile !== shape.executionProfile) {
  throw new Error(`unexpected execution profile: ${result.execution?.profile}`);
}

const runDir = path.dirname(runResultPath);
for (const artifact of ['patch.diff', 'run-result.json', 'summary.md', 'sanitized-signal.json']) {
  if (!fs.existsSync(path.join(runDir, artifact))) throw new Error(`missing run artifact file: ${artifact}`);
}

const patch = fs.readFileSync(path.join(runDir, 'patch.diff'), 'utf8');
if (!patch.includes('diff --git a/apps/web/src/generated/BL-001.ts b/apps/web/src/generated/BL-001.ts')) {
  throw new Error('patch.diff missing generated frontend feature path');
}
const signal = readJson(path.join(runDir, 'sanitized-signal.json'));
if (!signal.privacyFlags?.excludesRawPatchContent || signal.result !== 'passed') {
  throw new Error('sanitized signal did not preserve privacy/result flags');
}
NODE

echo "[ok] e2e demo completed"
echo "Target project: $TARGET"
echo "Run artifacts: $RUN_DIR"
