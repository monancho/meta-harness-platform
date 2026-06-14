import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listEvalSuites, runEvalSuite, writeEvalResult } from '../packages/core/src/evals.mjs';

const suites = listEvalSuites();
assert.deepEqual(
  suites.map(suite => suite.suiteId).sort(),
  ['acceptance-regression', 'factory-upgrade-regression', 'local-smoke']
);

for (const suite of suites) {
  assert.equal(suite.network, 'none');
  assert.equal(suite.scoring.metadata.rawProjectData, false);
}

const result = runEvalSuite('local-smoke', { noNetwork: true });
assert.equal(result.status, 'passed');
assert.match(result.resultHash, /^sha256:[a-f0-9]{64}$/);

const rerun = runEvalSuite('local-smoke', { noNetwork: true });
assert.deepEqual(rerun, result);

const out = path.join(os.tmpdir(), `mh-eval-result-${process.pid}.json`);
writeEvalResult(result, out);
const saved = JSON.parse(fs.readFileSync(out, 'utf8'));
assert.deepEqual(saved, result);
fs.rmSync(out, { force: true });

console.log('[ok] eval registry test passed');
