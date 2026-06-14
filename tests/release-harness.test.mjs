#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  cmdReleaseDryRun,
  defaultReleaseGuideContent,
  defaultReleaseReadinessContent,
  missingRequiredReleaseGates,
  parseReleaseReadiness
} from '../packages/core/src/release.mjs';

const target = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-release-'));
fs.mkdirSync(path.join(target, '.harness/release'), { recursive: true });
fs.mkdirSync(path.join(target, 'docs/operations'), { recursive: true });
fs.writeFileSync(path.join(target, '.harness/state.yml'), `schemaVersion: 1
projectState:
  projectId: release-test
  phase: factory-ready
`, 'utf8');
fs.writeFileSync(path.join(target, '.harness/release/release-readiness.yml'), defaultReleaseReadinessContent(), 'utf8');
fs.writeFileSync(path.join(target, 'docs/operations/release.md'), defaultReleaseGuideContent(), 'utf8');

const readiness = parseReleaseReadiness(defaultReleaseReadinessContent());
assert.deepEqual(missingRequiredReleaseGates(readiness), []);
assert.deepEqual(readiness.gates.map(gate => gate.id), [
  'tests',
  'build',
  'migration-notes',
  'rollback-plan',
  'env-checklist',
  'artifact-availability'
]);

const missingReadiness = parseReleaseReadiness(`schemaVersion: 1
release:
  deploymentDefault: disabled
gates:
  - id: tests
    title: Tests
    required: true
    status: todo
    evidence: []
`);
assert.deepEqual(missingRequiredReleaseGates(missingReadiness), [
  'build',
  'migration-notes',
  'rollback-plan',
  'env-checklist',
  'artifact-availability'
]);

let captured = '';
const originalLog = console.log;
console.log = (message = '') => { captured += `${message}\n`; };
try {
  cmdReleaseDryRun({ target }, (message) => { throw new Error(message); });
} finally {
  console.log = originalLog;
}

const manifestPath = path.join(target, '.harness/release/release-package-manifest.json');
assert.equal(fs.existsSync(manifestPath), true);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.equal(manifest.deploymentPerformed, false);
assert.equal(manifest.mode, 'dry-run');
assert.equal(manifest.gates.length, 6);
assert.equal(manifest.summary.requiredGates, 6);
assert.match(captured, /# Release Dry Run/);
assert.match(captured, /Deployment performed: false/);
assert.match(captured, /Required next actions:/);
assert.match(captured, /Deployment is disabled by default/);

fs.writeFileSync(path.join(target, '.harness/release/release-readiness.yml'), `schemaVersion: 1
release:
  deploymentDefault: disabled
gates:
  - id: tests
    title: Tests
    required: true
    status: todo
    evidence: []
`, 'utf8');
assert.throws(
  () => cmdReleaseDryRun({ target }, (message) => { throw new Error(message); }),
  /missing release gates: build, migration-notes, rollback-plan, env-checklist, artifact-availability/
);

console.log('[release-harness] OK');
