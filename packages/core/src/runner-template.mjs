export function targetRunnerCode() { return `#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

function parse(argv){ const o={_:[]}; for(let i=0;i<argv.length;i++){ const a=argv[i]; if(a.startsWith('--')){ const k=a.slice(2); const n=argv[i+1]; if(!n||n.startsWith('--')) o[k]=true; else {o[k]=n;i++;}} else o._.push(a);} return o; }
function ensureDir(p){ fs.mkdirSync(p,{recursive:true}); }
function write(p,s){ ensureDir(path.dirname(p)); fs.writeFileSync(p,s,'utf8'); }
function readJson(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }
function safe(s){ return String(s).replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,80); }
function id(){
  const now = new Date();
  const stamp = now.toISOString().slice(0,19).replace(/[-:T]/g,'');
  const ms = String(now.getUTCMilliseconds()).padStart(3,'0');
  return stamp + '-' + ms + '-' + crypto.randomBytes(3).toString('hex');
}
function createRunLayout(targetRoot, taskId){
  for (let attempt = 0; attempt < 20; attempt++) {
    const runId = 'run-' + id() + '-' + safe(taskId || 'task');
    const runDir = path.join(targetRoot,'.harness','runs',runId);
    const tmpDir = path.join(targetRoot,'.harness','tmp','worktrees',runId);
    if (!fs.existsSync(runDir) && !fs.existsSync(tmpDir)) return { runId, runDir, tmpDir };
  }
  throw new Error('Unable to allocate unique harness run id.');
}
function run(cmd, cwd){ try { const out = execSync(cmd,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}); return {command:cmd,status:'passed',output:out.trim()}; } catch(e){ return {command:cmd,status:'failed',output:(e.stdout||'')+(e.stderr||e.message)}; } }
function gitOk(cwd, cmd){ try { execSync('git '+cmd,{cwd,stdio:['ignore','ignore','ignore']}); return true; } catch { return false; } }
function gitOut(cwd, cmd){ return execSync('git '+cmd,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim(); }
function isGitRepo(cwd){ return gitOk(cwd, '--version') && gitOk(cwd, 'rev-parse --is-inside-work-tree') && gitOk(cwd, 'rev-parse --verify HEAD'); }
function changedFilesFromStatus(cwd){
  try {
    return gitOut(cwd, 'status --porcelain').split('\\n').filter(Boolean).map(line => line.slice(3).trim()).filter(Boolean);
  } catch { return []; }
}
function createPatchForFile(changedPath, content){
  return \`diff --git a/\${changedPath} b/\${changedPath}
new file mode 100644
--- /dev/null
+++ b/\${changedPath}
@@ -0,0 +1,6 @@
\${content.split('\\n').filter(Boolean).map(l => '+' + l).join('\\n')}
\`;
}
function collectGitPatch(cwd, changedPath, content){
  try {
    gitOut(cwd, 'add -N -- '+JSON.stringify(changedPath));
    const patch = gitOut(cwd, 'diff --binary --no-ext-diff -- '+JSON.stringify(changedPath));
    return patch || createPatchForFile(changedPath, content);
  } catch {
    return createPatchForFile(changedPath, content);
  }
}

const opts = parse(process.argv.slice(2));
const taskPath = opts.task || '.harness/tasks/example.task.json';
const adapter = opts.adapter || 'shell';
if(!fs.existsSync(taskPath)){ console.error('[runner:error] task file not found: '+taskPath); process.exit(1); }
const task = readJson(taskPath);
const targetRoot = process.cwd();
const { runId, runDir, tmpDir } = createRunLayout(targetRoot, task.taskId || 'task');
ensureDir(runDir); ensureDir(path.dirname(tmpDir));

let executionDir = targetRoot;
let mode = 'fallback';
if (isGitRepo(targetRoot)) {
  try {
    execSync('git worktree add --detach '+JSON.stringify(tmpDir)+' HEAD', { cwd: targetRoot, stdio: ['ignore','pipe','pipe'] });
    executionDir = tmpDir;
    mode = 'git-worktree';
  } catch (error) {
    mode = 'fallback';
    ensureDir(tmpDir);
  }
} else {
  ensureDir(tmpDir);
}

const changedPath = path.join('apps','web','src','generated',safe(task.taskId || 'task') + '.ts');
const content = \`export const generatedTask = {
  taskId: "\${task.taskId || 'unknown'}",
  objective: "\${String(task.objective || '').replace(/"/g, '\\\\"')}",
  generatedBy: "shell-adapter",
  generatedAt: "\${new Date().toISOString()}"
};
\`;
write(path.join(executionDir, changedPath), content);

const patch = mode === 'git-worktree'
  ? collectGitPatch(executionDir, changedPath, content)
  : createPatchForFile(changedPath, content);
write(path.join(runDir,'patch.diff'), patch);

const verify = (task.commands?.verify || []).map(command => run(command, executionDir));
const failed = verify.filter(x => x.status !== 'passed');
const changedFiles = mode === 'git-worktree' ? changedFilesFromStatus(executionDir) : [changedPath];
const result = {
  schemaVersion: '1.0.0',
  runId,
  adapter,
  taskId: task.taskId,
  status: failed.length ? 'failed' : 'passed',
  changedFiles: changedFiles.length ? changedFiles : [changedPath],
  verify,
  artifacts: ['patch.diff','run-result.json','summary.md'],
  startedAt: new Date().toISOString(),
  execution: { profile: 'L0_LOCAL_WORKTREE', mode, worktreePath: mode === 'git-worktree' ? path.relative(targetRoot, tmpDir) : null },
  notes: mode === 'git-worktree'
    ? 'L0 git worktree shell adapter run.'
    : 'Fallback shell adapter run. Used when git is unavailable or the target is not an initialized git repo.'
};
write(path.join(runDir,'run-result.json'), JSON.stringify(result,null,2)+'\\n');
write(path.join(runDir,'summary.md'), \`# Harness Run Summary

- Run ID: \${runId}
- Task: \${task.taskId}
- Adapter: \${adapter}
- Status: \${result.status}
- Execution: \${mode}
- Changed files: \${result.changedFiles.join(', ')}

## Objective

\${task.objective || ''}

## Verify

\${verify.map(v => '- '+v.command+': '+v.status).join('\\n')}
\`);

if (opts.cleanup !== 'false') {
  if (mode === 'git-worktree') {
    try { execSync('git worktree remove --force '+JSON.stringify(tmpDir), { cwd: targetRoot, stdio: ['ignore','ignore','ignore'] }); } catch {}
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
console.log('[ok] harness run completed: '+runDir);
`; }
