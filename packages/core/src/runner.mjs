import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { abs, exists } from './fs-utils.mjs';
import { assertContractFile } from './contracts.mjs';

function listRunResultFiles(target) {
  const runsDir = path.join(target, '.harness/runs');
  if (!exists(runsDir)) return new Set();
  const dirs = fs.readdirSync(runsDir, { withFileTypes: true }).filter(entry => entry.isDirectory());
  return new Set(dirs.map(entry => path.join(runsDir, entry.name, 'run-result.json')).filter(file => exists(file)));
}

export function cmdRun(opts, fail) {
  const target = abs(opts.target || '.');
  const runner = path.join(target, '.harness/bin/runner.mjs');
  if (!exists(runner)) fail('runner not found. Run factory bootstrap first.');
  const task = opts.task || '.harness/tasks/example.task.json';
  const taskPath = path.resolve(target, task);
  if (!exists(taskPath)) fail(`task file not found: ${task}`);
  assertContractFile('taskPacket', taskPath, fail);
  const adapter = opts.adapter || 'shell';
  const before = listRunResultFiles(target);
  execSync(`node ${JSON.stringify(runner)} --task ${JSON.stringify(task)} --adapter ${JSON.stringify(adapter)}`, { cwd: target, stdio: 'inherit' });
  const after = [...listRunResultFiles(target)].filter(file => !before.has(file)).sort();
  const resultPath = after.at(-1);
  if (!resultPath) fail('run-result.json not found after harness run');
  assertContractFile('runResult', resultPath, fail);
}
