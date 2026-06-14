#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parsePatchDiff } from '../apps/dashboard/src/patch-diff.mjs';

const fixtureDir = path.resolve('tests/fixtures/dashboard-patches');
const forbiddenScope = [
  '.env*',
  'node_modules/**',
  'docs/spec/*.pdf',
  'docs/spec/*.docx',
  '**/*SECRET*',
  '**/*TOKEN*'
];

const normal = parsePatchDiff(await readFixture('normal.patch'), { forbiddenScope });
assert.equal(normal.state, 'ready');
assert.equal(normal.summary.filesChanged, 2);
assert.equal(normal.summary.additions, 4);
assert.equal(normal.summary.deletions, 1);
assert.equal(normal.files[0].displayPath, 'apps/web/src/index.ts');
assert.equal(normal.files[0].hunks[0].lines.some(line => line.kind === 'context'), true);
assert.equal(normal.summary.riskyPaths.length, 0);

const empty = parsePatchDiff(await readFixture('empty.patch'), { forbiddenScope });
assert.equal(empty.state, 'empty');
assert.equal(empty.summary.filesChanged, 0);

const malformed = parsePatchDiff(await readFixture('malformed.patch'), { forbiddenScope });
assert.equal(malformed.state, 'malformed');
assert.equal(malformed.summary.malformedLineCount, 3);

const forbidden = parsePatchDiff(await readFixture('forbidden-path.patch'), { forbiddenScope });
assert.equal(forbidden.state, 'ready');
assert.equal(forbidden.summary.filesChanged, 2);
assert.equal(forbidden.summary.riskyPaths.length, 2);
assert.deepEqual(
  forbidden.summary.riskyPaths.map(match => match.pattern).sort(),
  ['.env*', 'docs/spec/*.pdf']
);

const large = parsePatchDiff(await readFixture('normal.patch'), { forbiddenScope, maxDisplayLines: 2 });
assert.equal(large.summary.truncated, true);

console.log('[dashboard-patch-diff] OK');

function readFixture(fileName) {
  return fs.readFile(path.join(fixtureDir, fileName), 'utf8');
}
