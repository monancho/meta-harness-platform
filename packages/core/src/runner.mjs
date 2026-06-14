import { execSync } from 'node:child_process';
import path from 'node:path';
import { abs, exists } from './fs-utils.mjs';

export function cmdRun(opts, fail) {
  const target = abs(opts.target || '.');
  const runner = path.join(target, '.harness/bin/runner.mjs');
  if (!exists(runner)) fail('runner not found. Run factory bootstrap first.');
  const task = opts.task || '.harness/tasks/example.task.json';
  const adapter = opts.adapter || 'shell';
  execSync(`node ${JSON.stringify(runner)} --task ${JSON.stringify(task)} --adapter ${JSON.stringify(adapter)}`, { cwd: target, stdio: 'inherit' });
}
