#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildProductizationReport,
  defaultAuditChecklistContent,
  parseAuditChecklist
} from '../packages/core/src/productization.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDir = path.join(root, 'tests/fixtures/productization');
const target = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-productization-'));
const checklistTarget = path.join(target, '.harness/productization/audit-checklist.yml');
const runDir = path.join(target, '.harness/runs/run-20260614000000-001-PROD-AUDIT');
fs.mkdirSync(path.dirname(checklistTarget), { recursive: true });
fs.mkdirSync(runDir, { recursive: true });
fs.copyFileSync(path.join(fixtureDir, 'audit-checklist.yml'), checklistTarget);
fs.copyFileSync(path.join(fixtureDir, 'run-result.json'), path.join(runDir, 'run-result.json'));

const checklist = parseAuditChecklist(fs.readFileSync(checklistTarget, 'utf8'));
assert.deepEqual(checklist.categories.map(category => category.id), [
  'ux',
  'a11y',
  'responsive',
  'performance',
  'security',
  'content',
  'release-readiness'
]);
assert.equal(checklist.policy.autoFixDefault, false);
assert.equal(checklist.checks.length, 3);

const runInfo = {
  path: path.join(runDir, 'run-result.json'),
  result: JSON.parse(fs.readFileSync(path.join(runDir, 'run-result.json'), 'utf8'))
};
const { markdown, backlog } = buildProductizationReport({ checklist, runInfo });
assert.equal(backlog.length, 2);
assert.equal(backlog[0].id, 'HARDEN-001');
assert.equal(backlog[0].sourceCheck, 'a11y-keyboard-screenreader');
assert.match(markdown, /# Productization Audit Report/);
assert.match(markdown, /Auto-fix default: false/);
assert.match(markdown, /It does not auto-fix findings/);
assert.match(markdown, /HARDEN-001: Harden keyboard and screen reader support/);
assert.match(markdown, /Run evidence: run-20260614000000-001-PROD-AUDIT/);

const defaultChecklist = parseAuditChecklist(defaultAuditChecklistContent());
assert.deepEqual(defaultChecklist.categories.map(category => category.id), [
  'ux',
  'a11y',
  'responsive',
  'performance',
  'security',
  'content',
  'release-readiness'
]);
assert.equal(defaultChecklist.policy.autoFixDefault, false);
assert.equal(defaultChecklist.checks.length, 7);

console.log('[productization-report] OK');
