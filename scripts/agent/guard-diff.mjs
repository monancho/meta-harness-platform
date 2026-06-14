#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function currentTaskId() {
  try {
    const branch = sh('git branch --show-current');
    const m = branch.match(/^feat\/(MH-\d+)/);
    if (m) return m[1];
  } catch {}
  const cur = '.harness/agent-workspace/current-task.md';
  if (fs.existsSync(cur)) {
    const txt = fs.readFileSync(cur, 'utf8');
    const m = txt.match(/^# 현재 작업:\s*(MH-\d+)/m);
    if (m) return m[1];
  }
  return null;
}
function globToRe(glob) {
  let s = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  s = s.replace(/\*\*/g, '___GLOBSTAR___');
  s = s.replace(/\*/g, '[^/]*');
  s = s.replace(/___GLOBSTAR___/g, '.*');
  return new RegExp('^' + s + '$');
}
function matchesAny(file, globs) {
  return globs.some(g => globToRe(g).test(file));
}

const id = currentTaskId();
if (!id) {
  console.error('[guard-diff:error] 현재 작업 ID를 찾지 못했습니다.');
  process.exit(1);
}
const taskFile = fs.readdirSync('.harness/agent-workspace/tasks').find(f => f.startsWith(id + '-') && f.endsWith('.task.json'));
if (!taskFile) {
  console.error(`[guard-diff:error] task packet을 찾지 못했습니다: ${id}`);
  process.exit(1);
}
const task = JSON.parse(fs.readFileSync(path.join('.harness/agent-workspace/tasks', taskFile), 'utf8'));
const forbidden = [
  ...(task.forbiddenScope || []),
  '.env*', '.env.*', '**/*SECRET*', '**/*TOKEN*', 'node_modules/**', '.git/**'
];
const filesRaw = [
  sh('git diff --name-only || true'),
  sh('git diff --cached --name-only || true'),
  sh('git ls-files --others --exclude-standard || true')
].join('\n');
const files = [...new Set(filesRaw.split('\n').map(x => x.trim()).filter(Boolean))];
const violations = files.filter(f => matchesAny(f, forbidden));
if (violations.length) {
  console.error('[guard-diff:error] 수정 금지 파일이 변경되었습니다:');
  for (const v of violations) console.error(' - ' + v);
  process.exit(1);
}
const maxFiles = task.budgets?.maxChangedFiles ?? 80;
if (files.length > maxFiles) {
  console.error(`[guard-diff:error] 변경 파일 수가 예산을 초과했습니다: ${files.length} > ${maxFiles}`);
  process.exit(1);
}
console.log(`[guard-diff] OK: ${id}, changed files=${files.length}`);
