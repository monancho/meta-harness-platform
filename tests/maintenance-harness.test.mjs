#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildFactoryFilePlan } from '../packages/core/src/factory-plan.mjs';
import {
  MAINTENANCE_TASK_TYPES,
  buildMaintenanceBacklogItem,
  cmdMaintenanceCreate,
  defaultMaintenanceConfigContent,
  maintenanceTaskPacketFromBacklogItem
} from '../packages/core/src/maintenance.mjs';
import { validateObject } from '../packages/core/src/contracts.mjs';

const fixturePath = path.resolve('tests/fixtures/maintenance/dependency-input.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const target = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-maintenance-'));
const handoffPath = path.join(target, '.harness/planning/build-handoff.json');
fs.mkdirSync(path.dirname(handoffPath), { recursive: true });
fs.writeFileSync(handoffPath, JSON.stringify({ projectId: 'maint-test', projectName: 'Maintenance Test' }, null, 2) + '\n');

const files = new Map(buildFactoryFilePlan({
  projectId: 'maint-test',
  handoff: { projectId: 'maint-test', projectName: 'Maintenance Test' },
  handoffPath
}).map(file => [file.path, file.content]));

for (const rel of [
  '.harness/maintenance/config.yml',
  '.harness/maintenance/task-types.json',
  '.harness/maintenance/backlog.items.json',
  '.harness/maintenance/templates/dependency.task-template.json',
  '.harness/maintenance/templates/security.task-template.json',
  '.harness/maintenance/templates/bugfix.task-template.json',
  '.harness/maintenance/templates/incident.task-template.json',
  'docs/operations/incident-report.md',
  'docs/operations/postmortem.md'
]) {
  assert.equal(files.has(rel), true, `missing generated file: ${rel}`);
}

assert.match(defaultMaintenanceConfigContent(), /maintenance-dependency/);
assert.match(files.get('.harness/maintenance/config.yml'), /defaultVerifyCommands:/);
assert.match(files.get('docs/operations/incident-report.md'), /# Incident Report/);
assert.match(files.get('docs/operations/postmortem.md'), /# Postmortem/);

const taskTypes = JSON.parse(files.get('.harness/maintenance/task-types.json'));
assert.deepEqual(Object.keys(taskTypes.taskTypes), ['dependency', 'security', 'bugfix', 'incident']);
assert.deepEqual(taskTypes.taskTypes.dependency.defaultVerifyCommands, MAINTENANCE_TASK_TYPES.dependency.verifyCommands);

const dependencyTemplate = JSON.parse(files.get('.harness/maintenance/templates/dependency.task-template.json'));
assert.equal(dependencyTemplate.taskType, 'maintenance-dependency');
assert.deepEqual(dependencyTemplate.verifyCommands, MAINTENANCE_TASK_TYPES.dependency.verifyCommands);
assert.equal(validateObject('taskPacket', dependencyTemplate).ok, true);

const item = buildMaintenanceBacklogItem(fixture);
assert.equal(item.id, 'MAINT-DEP-042');
assert.equal(item.taskType, 'maintenance-dependency');
assert.deepEqual(item.verifyCommands, MAINTENANCE_TASK_TYPES.dependency.verifyCommands);

const taskPacket = maintenanceTaskPacketFromBacklogItem(item);
assert.equal(validateObject('taskPacket', taskPacket).ok, true);
assert.equal(taskPacket.maintenance.packageName, 'workspace');

let captured = '';
const message = cmdMaintenanceCreate({ target, input: fixturePath }, (failure) => { throw new Error(failure); });
captured += message;
assert.match(captured, /MAINT-DEP-042.task.json/);

const backlog = JSON.parse(fs.readFileSync(path.join(target, '.harness/maintenance/backlog.items.json'), 'utf8'));
assert.equal(backlog.backlog.length, 1);
assert.equal(backlog.backlog[0].kind, 'dependency');

const writtenTask = JSON.parse(fs.readFileSync(path.join(target, '.harness/tasks/MAINT-DEP-042.task.json'), 'utf8'));
assert.equal(writtenTask.taskType, 'maintenance-dependency');
assert.deepEqual(writtenTask.verifyCommands, MAINTENANCE_TASK_TYPES.dependency.verifyCommands);

console.log('[maintenance-harness] OK');
