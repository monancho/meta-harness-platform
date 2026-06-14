#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadDashboardFixtures, summarizeDashboardFixtures } from '../apps/dashboard/src/fixture-loader.mjs';

const fixtureBase = 'apps/dashboard/fixtures';
const fixtures = await loadDashboardFixtures({
  basePath: fixtureBase,
  readText: filePath => fs.readFile(path.resolve(filePath), 'utf8')
});
const summary = summarizeDashboardFixtures(fixtures);

assert.equal(fixtures.runResult.taskId, 'MH-011');
assert.equal(fixtures.manifest.generator.version, '1.4.0-instant-devcontainer');
assert.equal(fixtures.state.phase, 'runnable');
assert.equal(fixtures.taskPacket.taskId, 'MH-011');
assert.equal(summary.projectId, 'dashboard-demo');
assert.equal(summary.lastRunStatus, 'failed');
assert.equal(summary.runCount, 2);
assert.equal(summary.artifactCount, 9);
assert.equal(summary.managedFileCount, 3);
assert.equal(summary.policyCount, 9);

console.log('[dashboard-fixture-loader] OK');
