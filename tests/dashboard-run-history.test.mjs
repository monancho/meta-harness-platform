#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  discoverRunHistory,
  parseRunResultJson,
  summarizeRunHistory
} from '../apps/dashboard/src/run-history.mjs';

const runsDir = path.resolve('tests/fixtures/dashboard-runs/.harness/runs');
const history = await discoverRunHistory({
  runsDir,
  readdir: fs.readdir,
  readText: filePath => fs.readFile(filePath, 'utf8'),
  joinPath: path.join
});

assert.equal(history.state, 'ready');
assert.equal(history.errors.length, 0);
assert.equal(history.runs.length, 2);
assert.equal(history.runs[0].taskId, 'MH-012');
assert.equal(history.runs[0].status, 'passed');
assert.equal(history.runs[0].adapter, 'shell');
assert.equal(history.runs[0].durationMs, 3500);
assert.equal(history.runs[0].timestamp, '2026-06-14T13:10:03.500Z');

const kinds = new Set(history.runs[0].artifacts.map(artifact => artifact.kind));
for (const kind of ['patch', 'summary', 'result', 'test-report', 'screenshot', 'artifact']) {
  assert.equal(kinds.has(kind), true, `missing artifact kind: ${kind}`);
}

const summary = summarizeRunHistory(history);
assert.equal(summary.runCount, 2);
assert.equal(summary.passedCount, 1);
assert.equal(summary.failedCount, 1);
assert.equal(summary.artifactCount, 10);
assert.equal(summary.latestRunStatus, 'passed');

const empty = await discoverRunHistory({
  runsDir: path.resolve('tests/fixtures/dashboard-runs/.harness/missing-runs'),
  readdir: fs.readdir,
  readText: filePath => fs.readFile(filePath, 'utf8'),
  joinPath: path.join
});
assert.equal(empty.state, 'empty');
assert.deepEqual(empty.runs, []);

assert.throws(
  () => parseRunResultJson('{broken', { runId: 'malformed-run' }),
  /Invalid run-result\.json for malformed-run/
);

const malformed = await discoverRunHistory({
  runsDir: '/virtual/.harness/runs',
  readdir: async () => [{ name: 'malformed-run', isDirectory: () => true }],
  readText: async () => '{broken',
  joinPath: path.join
});
assert.equal(malformed.state, 'error');
assert.equal(malformed.runs.length, 0);
assert.match(malformed.errors[0].message, /Invalid run-result\.json for malformed-run/);

console.log('[dashboard-run-history] OK');
