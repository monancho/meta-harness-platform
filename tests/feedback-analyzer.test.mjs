#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeFeedbackSignals } from '../packages/core/src/feedback-analyzer.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputDir = path.join(root, 'tests/fixtures/feedback-signals');
const expectedPath = path.join(root, 'tests/fixtures/feedback-analyzer-expected/failure-taxonomy.json');
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-feedback-analysis-'));

const summary = analyzeFeedbackSignals({ inputDir, outputDir, analyzerVersion: 'test-version' });
const actual = JSON.parse(fs.readFileSync(path.join(outputDir, 'failure-taxonomy.json'), 'utf8'));
const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
expected.input.directory = inputDir;

assert.deepEqual(actual, expected);
assert.deepEqual(summary, expected);

const markdown = fs.readFileSync(path.join(outputDir, 'failure-taxonomy.md'), 'utf8');
assert.match(markdown, /Failure Taxonomy Summary/);
assert.match(markdown, /raw project documents, code, logs, patches, secrets, and customer text are not used or stored/);

const proposalPath = path.join(
  outputDir,
  'improvement-proposals/verification__mh_verify_failed__l0_local_worktree__shell__1.4.0-instant-devcontainer.md'
);
const proposal = fs.readFileSync(proposalPath, 'utf8');
assert.match(proposal, /Status: candidate-only/);
assert.match(proposal, /Validation required: eval regression must pass/);
assert.match(proposal, /Privacy Boundary/);

for (const rawLeak of ['Acme', 'customer checkout', 'console.log', 'ghp_']) {
  assert.equal(JSON.stringify(actual).includes(rawLeak), false, `taxonomy leaked raw value: ${rawLeak}`);
  assert.equal(proposal.includes(rawLeak), false, `proposal leaked raw value: ${rawLeak}`);
}

console.log('[feedback-analyzer] OK');
