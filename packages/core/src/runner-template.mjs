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
    const output = execSync('git status --porcelain',{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
    return output.split('\\n').filter(Boolean).map(line => line.slice(3).trim()).filter(Boolean);
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
function normalizePath(p){ return String(p || '').replace(/\\\\/g,'/').replace(/^\\.\\//,''); }
function escapeRe(s){ return String(s).replace(/[\\\\^$.*+?()[\\]{}|]/g, '\\\\$&'); }
function globToRe(glob){
  let s = escapeRe(normalizePath(glob));
  s = s.replace(/\\\\\\*\\\\\\*/g, '___GLOBSTAR___');
  s = s.replace(/\\\\\\*/g, '[^/]*');
  s = s.replace(/___GLOBSTAR___/g, '.*');
  return new RegExp('^' + s + '$');
}
function matchesAny(file, globs){ const f = normalizePath(file); return (globs || []).some(g => globToRe(g).test(f)); }
function commandPatternToRe(pattern){
  let s = escapeRe(String(pattern || '').trim());
  s = s.replace(/\\\\\\*/g, '.*');
  return new RegExp('^' + s + '$');
}
function commandMatches(command, patterns){ return (patterns || []).some(pattern => commandPatternToRe(pattern).test(String(command).trim())); }
function listValue(line){ return line.replace(/^\\s*-\\s*/, '').trim().replace(/^["']|["']$/g, ''); }
function readRuntimePolicy(targetRoot){
  const policyPath = path.join(targetRoot,'.harness','security','runtime-policy.yml');
  const policy = {
    forbiddenWrites: ['.env*','**/*.pem','**/*secret*','**/*token*','infra/**/production/**','.github/workflows/deploy-prod.yml'],
    commandPolicy: { default: 'allow', allow: [], deny: ['git push*','npm publish*','docker login*','rm -rf .git*'] }
  };
  if (!fs.existsSync(policyPath)) return policy;
  const lines = fs.readFileSync(policyPath,'utf8').split(/\\r?\\n/);
  let section = null;
  for (const line of lines) {
    if (/^\\s*forbiddenWrites:\\s*$/.test(line)) { section = 'forbiddenWrites'; continue; }
    if (/^\\s*commandPolicy:\\s*$/.test(line)) { section = 'commandPolicy'; continue; }
    if (section === 'forbiddenWrites' && /^\\s*-\\s+/.test(line)) { policy.forbiddenWrites.push(listValue(line)); continue; }
    if (section === 'commandPolicy' && /^\\s*default:\\s*/.test(line)) {
      policy.commandPolicy.default = line.split(':').slice(1).join(':').trim();
      continue;
    }
    if (section?.startsWith('command') && /^\\s*allow:\\s*$/.test(line)) { section = 'commandAllow'; continue; }
    if (section?.startsWith('command') && /^\\s*deny:\\s*$/.test(line)) { section = 'commandDeny'; continue; }
    if (section === 'commandAllow' && /^\\s*-\\s+/.test(line)) { policy.commandPolicy.allow.push(listValue(line)); continue; }
    if (section === 'commandDeny' && /^\\s*-\\s+/.test(line)) { policy.commandPolicy.deny.push(listValue(line)); continue; }
    if (/^\\S/.test(line)) section = null;
  }
  policy.forbiddenWrites = [...new Set(policy.forbiddenWrites.filter(Boolean))];
  return policy;
}
function scopePatternInvalid(pattern){
  const p = normalizePath(pattern);
  return !p || path.isAbsolute(p) || p === '..' || p.startsWith('../') || p.includes('/../') || /(^|\\/)(\\.git|node_modules)(\\/|$)/.test(p);
}
function validateTaskSecurity(task, runtimePolicy, plannedChangedFiles){
  const editable = task.editableScope || [];
  const forbidden = [...(task.forbiddenScope || []), ...(runtimePolicy.forbiddenWrites || [])];
  if (!Array.isArray(editable) || !editable.length) return { ok:false, reasonCode:'MH_SECURITY_INVALID_SCOPE', message:'editableScope must not be empty' };
  if (!Array.isArray(task.forbiddenScope) || !task.forbiddenScope.length) return { ok:false, reasonCode:'MH_SECURITY_INVALID_SCOPE', message:'forbiddenScope must not be empty' };
  for (const pattern of [...editable, ...forbidden]) {
    if (scopePatternInvalid(pattern)) return { ok:false, reasonCode:'MH_SECURITY_INVALID_SCOPE', message:'invalid scope pattern: '+pattern };
  }
  for (const pattern of editable) {
    if (matchesAny(pattern, forbidden) || forbidden.includes(pattern)) {
      return { ok:false, reasonCode:'MH_SECURITY_SCOPE_OVERLAP', message:'editableScope overlaps forbiddenScope: '+pattern };
    }
  }
  for (const changed of plannedChangedFiles) {
    if (!matchesAny(changed, editable)) return { ok:false, reasonCode:'MH_SECURITY_EDITABLE_SCOPE_VIOLATION', message:'planned write outside editableScope: '+changed };
    if (matchesAny(changed, forbidden)) return { ok:false, reasonCode:'MH_SECURITY_FORBIDDEN_PATH', message:'planned write is forbidden: '+changed };
  }
  const commands = task.commands?.verify || [];
  for (const command of commands) {
    if (commandMatches(command, runtimePolicy.commandPolicy?.deny || [])) {
      return { ok:false, reasonCode:'MH_SECURITY_COMMAND_DENIED', message:'command denied by runtime policy: '+command };
    }
    if (runtimePolicy.commandPolicy?.default === 'deny' && !commandMatches(command, runtimePolicy.commandPolicy?.allow || [])) {
      return { ok:false, reasonCode:'MH_SECURITY_COMMAND_NOT_ALLOWED', message:'command not allowed by runtime policy: '+command };
    }
  }
  return { ok:true };
}
function checkChangedFiles(changedFiles, task, runtimePolicy){
  const editable = task.editableScope || [];
  const forbidden = [...(task.forbiddenScope || []), ...(runtimePolicy.forbiddenWrites || [])];
  for (const file of changedFiles) {
    if (!matchesAny(file, editable)) return { ok:false, reasonCode:'MH_SECURITY_CHANGED_FILE_OUTSIDE_SCOPE', message:'changed file outside editableScope: '+file };
    if (matchesAny(file, forbidden)) return { ok:false, reasonCode:'MH_SECURITY_FORBIDDEN_CHANGED_FILE', message:'forbidden changed file detected: '+file };
  }
  return { ok:true };
}
function writeRunArtifacts({ runDir, runId, adapter, task, status, reasonCode, message, changedFiles = [], verify = [], patch = '', mode, tmpDir, targetRoot }){
  write(path.join(runDir,'patch.diff'), patch);
  const result = {
    schemaVersion: '1.0.0',
    runId,
    adapter,
    taskId: task.taskId,
    status,
    reasonCode,
    message,
    changedFiles,
    verify,
    artifacts: ['patch.diff','run-result.json','summary.md'],
    startedAt: new Date().toISOString(),
    execution: { profile: 'L0_LOCAL_WORKTREE', mode, worktreePath: mode === 'git-worktree' ? path.relative(targetRoot, tmpDir) : null },
    notes: status === 'failed' && reasonCode ? 'Security policy blocked the run before success was recorded.' : (mode === 'git-worktree'
      ? 'L0 git worktree shell adapter run.'
      : 'Fallback shell adapter run. Used when git is unavailable or the target is not an initialized git repo.')
  };
  write(path.join(runDir,'run-result.json'), JSON.stringify(result,null,2)+'\\n');
  write(path.join(runDir,'summary.md'), \`# Harness Run Summary

- Run ID: \${runId}
- Task: \${task.taskId}
- Adapter: \${adapter}
- Status: \${result.status}
- Reason: \${reasonCode || 'n/a'}
- Execution: \${mode}
- Changed files: \${result.changedFiles.join(', ')}

## Objective

\${task.objective || ''}

## Verify

\${verify.length ? verify.map(v => '- '+v.command+': '+v.status).join('\\n') : '- not run'}
\`);
  return result;
}
function cleanupWorktree(targetRoot, tmpDir, mode){
  if (mode === 'git-worktree') {
    try { execSync('git worktree remove --force '+JSON.stringify(tmpDir), { cwd: targetRoot, stdio: ['ignore','ignore','ignore'] }); } catch {}
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

const opts = parse(process.argv.slice(2));
const taskPath = opts.task || '.harness/tasks/example.task.json';
const adapter = opts.adapter || 'shell';
if(!fs.existsSync(taskPath)){ console.error('[runner:error] task file not found: '+taskPath); process.exit(1); }
const task = readJson(taskPath);
const targetRoot = process.cwd();
const { runId, runDir, tmpDir } = createRunLayout(targetRoot, task.taskId || 'task');
ensureDir(runDir); ensureDir(path.dirname(tmpDir));
const runtimePolicy = readRuntimePolicy(targetRoot);
const changedPath = path.join('apps','web','src','generated',safe(task.taskId || 'task') + '.ts');
const preflight = validateTaskSecurity(task, runtimePolicy, [changedPath]);
if (!preflight.ok) {
  writeRunArtifacts({ runDir, runId, adapter, task, status:'failed', reasonCode:preflight.reasonCode, message:preflight.message, mode:'not-started', tmpDir, targetRoot });
  console.error('[runner:security] '+preflight.reasonCode+': '+preflight.message);
  process.exit(1);
}

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

const verify = (task.commands?.verify || []).map(command => run(command, executionDir));
const failed = verify.filter(x => x.status !== 'passed');
const changedFiles = mode === 'git-worktree' ? changedFilesFromStatus(executionDir) : [changedPath];
const changedCheck = checkChangedFiles(changedFiles.length ? changedFiles : [changedPath], task, runtimePolicy);
const result = writeRunArtifacts({
  runDir,
  runId,
  adapter,
  task,
  status: failed.length || !changedCheck.ok ? 'failed' : 'passed',
  reasonCode: !changedCheck.ok ? changedCheck.reasonCode : (failed.length ? 'MH_VERIFY_FAILED' : undefined),
  message: !changedCheck.ok ? changedCheck.message : undefined,
  changedFiles: changedFiles.length ? changedFiles : [changedPath],
  verify,
  patch,
  mode,
  tmpDir,
  targetRoot
});

if (opts.cleanup !== 'false') {
  cleanupWorktree(targetRoot, tmpDir, mode);
}
if (result.status === 'failed' && result.reasonCode && result.reasonCode.startsWith('MH_SECURITY_')) {
  console.error('[runner:security] '+result.reasonCode+': '+(result.message || 'security policy failed'));
  process.exit(1);
}
console.log('[ok] harness run completed: '+runDir);
`; }
