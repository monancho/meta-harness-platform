#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSanitizedSignal, exportSanitizedSignal } from '../packages/core/src/sanitized-signal.mjs';
import { validateObject } from '../packages/core/src/contracts.mjs';

const rawCustomerText = 'Acme customer checkout launch plan';
const rawSecretLike = 'ghp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const rawPatchLine = '+export const customerPlan = "Acme customer checkout launch plan";';
const result = {
  schemaVersion: '1.0.0',
  runId: 'run-20260614120000-001-abcdef-MH-021',
  adapter: 'shell',
  taskId: 'MH-021',
  taskType: 'feedback',
  generatorVersion: '1.4.0-instant-devcontainer',
  status: 'failed',
  failureCategory: 'security',
  reasonCode: 'MH_SECURITY_SECRET_PATTERN',
  message: `${rawCustomerText} failed with ${rawSecretLike}`,
  changedFiles: ['apps/web/src/customer-specific-feature.ts'],
  verify: [
    {
      command: 'node test-customer-checkout.js',
      status: 'failed',
      output: `${rawCustomerText}\n${rawSecretLike}`
    }
  ],
  artifacts: ['patch.diff', 'run-result.json', 'summary.md'],
  startedAt: '2026-06-14T12:00:00.000Z',
  execution: { profile: 'L0_LOCAL_WORKTREE' }
};

const signal = buildSanitizedSignal(result, { patchLineCount: 42, createdAt: '2026-06-14T12:01:00.000Z' });
const validation = validateObject('sanitizedSignal', signal);
assert.equal(validation.ok, true, validation.errors.join('; '));

const serialized = JSON.stringify(signal);
for (const forbidden of [rawCustomerText, rawSecretLike, rawPatchLine, 'customer-specific-feature', 'test-customer-checkout', 'output', 'message', 'patch.diff']) {
  assert.equal(serialized.includes(forbidden), false, `signal leaked raw value: ${forbidden}`);
}
assert.deepEqual(signal.reasonCodes, ['MH_SECURITY_SECRET_PATTERN', 'MH_VERIFY_FAILED']);
assert.equal(signal.failureCategory, 'security');
assert.equal(signal.taskType, 'feedback');
assert.equal(signal.metricBuckets.changedFiles, '1');
assert.equal(signal.metricBuckets.verifyChecks, '1');
assert.equal(signal.metricBuckets.failedVerifyChecks, '1');
assert.equal(signal.metricBuckets.patchLines, '1-50');
for (const [flag, value] of Object.entries(signal.privacyFlags)) {
  assert.equal(value, true, `privacy flag should be true: ${flag}`);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-sanitized-signal-'));
const runDir = path.join(tmp, '.harness', 'runs', result.runId);
fs.mkdirSync(runDir, { recursive: true });
fs.writeFileSync(path.join(runDir, 'run-result.json'), JSON.stringify(result, null, 2), 'utf8');
fs.writeFileSync(path.join(runDir, 'patch.diff'), rawPatchLine, 'utf8');
const exported = exportSanitizedSignal({ runResultPath: path.join(runDir, 'run-result.json') });
assert.equal(exported.outputPath, path.join(runDir, 'sanitized-signal.json'));
const exportedText = fs.readFileSync(exported.outputPath, 'utf8');
assert.equal(exportedText.includes(rawCustomerText), false);
assert.equal(exportedText.includes(rawPatchLine), false);
assert.equal(JSON.parse(exportedText).privacyFlags.excludesSecrets, true);

console.log('[sanitized-signal] OK');
