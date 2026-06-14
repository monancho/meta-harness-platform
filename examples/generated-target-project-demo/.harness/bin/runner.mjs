#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

function parse(argv){ const o={_:[]}; for(let i=0;i<argv.length;i++){ const a=argv[i]; if(a.startsWith('--')){ const k=a.slice(2); const n=argv[i+1]; if(!n||n.startsWith('--')) o[k]=true; else {o[k]=n;i++;}} else o._.push(a);} return o; }
function ensureDir(p){ fs.mkdirSync(p,{recursive:true}); }
function write(p,s){ ensureDir(path.dirname(p)); fs.writeFileSync(p,s,'utf8'); }
function readJson(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }
function id(){ return new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14); }
function safe(s){ return String(s).replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,80); }
function run(cmd){ try { const out = execSync(cmd,{encoding:'utf8',stdio:['ignore','pipe','pipe']}); return {command:cmd,status:'passed',output:out.trim()}; } catch(e){ return {command:cmd,status:'failed',output:(e.stdout||'')+(e.stderr||e.message)}; } }

const opts = parse(process.argv.slice(2));
const taskPath = opts.task || '.harness/tasks/example.task.json';
const adapter = opts.adapter || 'shell';
if(!fs.existsSync(taskPath)){ console.error('[runner:error] task file not found: '+taskPath); process.exit(1); }
const task = readJson(taskPath);
const runId = 'run-' + id() + '-' + safe(task.taskId || 'task');
const runDir = path.join('.harness','runs',runId);
const tmpDir = path.join('.harness','tmp','worktrees',runId);
ensureDir(runDir); ensureDir(tmpDir);

const changedPath = path.join('apps','web','src','generated',safe(task.taskId || 'task') + '.ts');
const content = `export const generatedTask = {
  taskId: "${task.taskId || 'unknown'}",
  objective: "${String(task.objective || '').replace(/"/g, '\"')}",
  generatedBy: "shell-adapter",
  generatedAt: "${new Date().toISOString()}"
};
`;
write(changedPath, content);

const patch = `diff --git a/${changedPath} b/${changedPath}
new file mode 100644
--- /dev/null
+++ b/${changedPath}
@@ -0,0 +1,6 @@
${content.split('\n').filter(Boolean).map(l => '+' + l).join('\n')}
`;
write(path.join(runDir,'patch.diff'), patch);

const verify = (task.commands?.verify || []).map(run);
const failed = verify.filter(x => x.status !== 'passed');
const result = {
  schemaVersion: '1.0.0',
  runId,
  adapter,
  taskId: task.taskId,
  status: failed.length ? 'failed' : 'passed',
  changedFiles: [changedPath],
  verify,
  artifacts: ['patch.diff','run-result.json','summary.md'],
  startedAt: new Date().toISOString(),
  notes: 'MVP shell adapter run. This validates the harness pipeline without requiring an AI provider.'
};
write(path.join(runDir,'run-result.json'), JSON.stringify(result,null,2)+'\n');
write(path.join(runDir,'summary.md'), `# Harness Run Summary

- Run ID: ${runId}
- Task: ${task.taskId}
- Adapter: ${adapter}
- Status: ${result.status}
- Changed file: ${changedPath}

## Objective

${task.objective || ''}

## Verify

${verify.map(v => '- '+v.command+': '+v.status).join('\n')}
`);

if (opts.cleanup !== 'false') {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
console.log('[ok] harness run completed: '+runDir);
