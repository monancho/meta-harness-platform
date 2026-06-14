import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { abs, exists, shaFile } from './fs-utils.mjs';
import { assertContractFile } from './contracts.mjs';
import { assertPhase, readProjectId, setState, validateState } from './state.mjs';

function listRunResultFiles(target) {
  const runsDir = path.join(target, '.harness/runs');
  if (!exists(runsDir)) return new Set();
  const dirs = fs.readdirSync(runsDir, { withFileTypes: true }).filter(entry => entry.isDirectory());
  return new Set(dirs.map(entry => path.join(runsDir, entry.name, 'run-result.json')).filter(file => exists(file)));
}

export function cmdRun(opts, fail) {
  const target = abs(opts.target || '.');
  assertPhase(target, ['factory-ready', 'runnable'], 'run', fail);
  const runner = path.join(target, '.harness/bin/runner.mjs');
  if (!exists(runner)) fail('runner not found. Run factory bootstrap first.');
  const task = opts.task || '.harness/tasks/example.task.json';
  const taskPath = path.resolve(target, task);
  if (!exists(taskPath)) fail(`task file not found: ${task}`);
  assertContractFile('taskPacket', taskPath, fail);
  const adapter = opts.adapter || 'shell';
  const before = listRunResultFiles(target);
  const cleanupArg = opts.cleanup === undefined ? '' : ` --cleanup ${JSON.stringify(String(opts.cleanup))}`;
  let runnerError = null;
  try {
    execSync(`node ${JSON.stringify(runner)} --task ${JSON.stringify(task)} --adapter ${JSON.stringify(adapter)}${cleanupArg}`, { cwd: target, stdio: 'inherit' });
  } catch (error) {
    runnerError = error;
  }
  const after = [...listRunResultFiles(target)].filter(file => !before.has(file)).sort();
  const resultPath = after.at(-1);
  if (!resultPath) {
    if (runnerError) fail(`runner failed before writing run-result.json: ${runnerError.message}`);
    fail('run-result.json not found after harness run');
  }
  assertContractFile('runResult', resultPath, fail);
  if (runnerError) {
    const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    fail(`runner failed: ${result.reasonCode || result.status || runnerError.message}`);
  }
  setState(target, {
    projectId: readProjectId(target),
    phase: 'runnable',
    fail,
    fields: {
      lastRunResultHash: `sha256:${shaFile(resultPath)}`
    }
  });
  validateState(target, fail);
}
