export function targetRunnerCode() { return `#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync, spawnSync } from 'node:child_process';

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
function run(cmd, cwd, env = process.env){ try { const out = execSync(cmd,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],env}); return {command:cmd,status:'passed',output:out.trim()}; } catch(e){ return {command:cmd,status:'failed',output:(e.stdout||'')+(e.stderr||e.message)}; } }
function binaryExists(binary){
  const b = String(binary || '').trim();
  if (!b) return false;
  if (b.includes('/') || b.includes('\\\\')) {
    try { fs.accessSync(b, fs.constants.X_OK); return true; } catch { return false; }
  }
  try { execSync('command -v '+JSON.stringify(b),{stdio:['ignore','ignore','ignore']}); return true; } catch { return false; }
}
function gitOk(cwd, cmd){ try { execSync('git '+cmd,{cwd,stdio:['ignore','ignore','ignore']}); return true; } catch { return false; } }
function gitOut(cwd, cmd){ return execSync('git '+cmd,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim(); }
function isGitRepo(cwd){ return gitOk(cwd, '--version') && gitOk(cwd, 'rev-parse --is-inside-work-tree') && gitOk(cwd, 'rev-parse --verify HEAD'); }
function changedFilesFromStatus(cwd){
  try {
    const output = execSync('git status --porcelain',{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
    return output.split('\\n').filter(Boolean).map(line => line.slice(3).trim()).filter(Boolean);
  } catch { return []; }
}
function walkProjectFiles(root, dir = root, out = []){
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = normalizePath(path.relative(root, full));
    if (!rel || rel === '.git' || rel === 'node_modules' || rel.startsWith('.git/') || rel.startsWith('node_modules/')) continue;
    if (rel === '.harness/runs' || rel === '.harness/tmp' || rel.startsWith('.harness/runs/') || rel.startsWith('.harness/tmp/')) continue;
    if (entry.isDirectory()) walkProjectFiles(root, full, out);
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}
function changedFilesFromSnapshot(root, beforeFiles){
  const before = new Set(beforeFiles || []);
  return walkProjectFiles(root).filter(file => !before.has(file));
}
function collectGitPatchAll(cwd, changedFiles = []){
  for (const file of changedFiles) {
    try { execSync('git add -N -- '+JSON.stringify(file),{cwd,stdio:['ignore','ignore','ignore']}); } catch {}
  }
  try { return execSync('git diff --binary --no-ext-diff',{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}); } catch { return ''; }
}
function stableStringify(value){
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key)+':'+stableStringify(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}
function countBucket(count){
  const n = Number.isFinite(count) && count >= 0 ? count : 0;
  if (n === 0) return '0';
  if (n === 1) return '1';
  if (n <= 5) return '2-5';
  if (n <= 20) return '6-20';
  return '21-plus';
}
function lineBucket(count){
  const n = Number.isFinite(count) && count >= 0 ? count : 0;
  if (n === 0) return '0';
  if (n <= 50) return '1-50';
  if (n <= 250) return '51-250';
  if (n <= 1000) return '251-1000';
  return '1001-plus';
}
function safeMetricToken(value, fallback = 'unknown'){
  const normalized = String(value || '').trim();
  return /^[a-z0-9][a-z0-9_-]{0,63}$/.test(normalized) ? normalized : fallback;
}
function safeVersionToken(value){
  const normalized = String(value || '').trim();
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(normalized) ? normalized : 'unknown';
}
function safeSignalCode(value){
  const normalized = String(value || '').trim();
  return /^[A-Z0-9][A-Z0-9_:-]{0,79}$/.test(normalized) ? normalized : 'MH_REASON_UNCLASSIFIED';
}
function readGeneratorVersion(targetRoot){
  const factoryPath = path.join(targetRoot,'.harness','factory.yml');
  if (!fs.existsSync(factoryPath)) return 'unknown';
  const match = fs.readFileSync(factoryPath,'utf8').match(/^\\s*generatorVersion:\\s*(\\S+)\\s*$/m);
  return match ? match[1].replace(/^["']|["']$/g, '') : 'unknown';
}
function buildSanitizedSignal(result, patchLineCount){
  const verify = Array.isArray(result.verify) ? result.verify : [];
  const failedVerify = verify.filter(item => item?.status === 'failed').length;
  const reasonCodes = [...new Set([
    result.reasonCode,
    failedVerify > 0 ? 'MH_VERIFY_FAILED' : null
  ].filter(Boolean).map(safeSignalCode))];
  return {
    schemaVersion: '1.0.0',
    signalId: 'signal-' + crypto.createHash('sha256').update((result.runId || 'unknown')+':'+(result.startedAt || '')).digest('hex').slice(0,16),
    sourceRunId: String(result.runId || 'unknown'),
    generatorVersion: safeVersionToken(result.generatorVersion || 'unknown'),
    executionProfile: safeSignalCode(result.execution?.profile || 'L0_LOCAL_WORKTREE'),
    adapter: safeMetricToken(result.adapter || 'unknown'),
    taskType: safeMetricToken(result.taskType || 'unknown'),
    result: result.status === 'failed' ? 'failed' : 'passed',
    failureCategory: ['security','schema','verification','adapter','execution'].includes(result.failureCategory) ? result.failureCategory : (result.status === 'failed' ? 'execution' : undefined),
    reasonCodes,
    metricBuckets: {
      changedFiles: countBucket(Array.isArray(result.changedFiles) ? result.changedFiles.length : 0),
      verifyChecks: countBucket(verify.length),
      failedVerifyChecks: countBucket(failedVerify),
      patchLines: lineBucket(patchLineCount),
      artifactCount: countBucket(Array.isArray(result.artifacts) ? result.artifacts.length : 0)
    },
    improvementSignals: reasonCodes.length ? reasonCodes.map(code => 'reason:'+code) : [],
    privacyFlags: {
      excludesRawPatchContent: true,
      excludesRawLogs: true,
      excludesRawDocs: true,
      excludesSecrets: true,
      excludesCustomerText: true,
      containsOnlySanitizedMetrics: true,
      targetOwnsRawArtifacts: true
    },
    createdAt: new Date().toISOString()
  };
}
function buildCodexPrompt({ task, agentsText }){
  return [
    '# Meta Harness Codex Adapter Prompt',
    '',
    'You are running inside a Target Project Repo generated by Meta Harness.',
    'Implement exactly the selected task packet. Respect editableScope, forbiddenScope, and verification commands.',
    'Do not create or read secrets. Do not push, publish, deploy, or modify production infrastructure.',
    '',
    '## AGENTS.md',
    '',
    agentsText.trimEnd(),
    '',
    '## task-packet.json',
    '',
    '\`\`\`json',
    stableStringify(task),
    '\`\`\`',
    '',
    '## Required Output',
    '',
    '- Make only the code/doc/test changes required by this task.',
    '- Run the task packet verification commands when possible.',
    '- Leave all artifacts for Meta Harness to collect from the worktree.',
    ''
  ].join('\\n');
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
  const normalized = normalizePath(glob);
  let s = escapeRe(normalized);
  s = s.replace(/\\\\\\*\\\\\\*\\//g, '(?:.*/)?');
  s = s.replace(/\\\\\\*\\\\\\*/g, '.*');
  s = s.replace(/\\\\\\*/g, '[^/]*');
  return new RegExp('^' + s + '$');
}
function matchesAny(file, globs){ const f = normalizePath(file); return (globs || []).some(g => globToRe(g).test(f)); }
function commandPatternToRe(pattern){
  let s = escapeRe(String(pattern || '').trim());
  s = s.replace(/\\\\\\*/g, '.*');
  return new RegExp('^' + s + '$');
}
function commandMatches(command, patterns){ return (patterns || []).some(pattern => commandPatternToRe(pattern).test(String(command).trim())); }
const SECRET_VALUE_PATTERNS = [
  { name:'aws-access-key-id', re:/\\bAKIA[0-9A-Z]{16}\\b/ },
  { name:'github-token', re:/\\bgh[pousr]_[A-Za-z0-9_]{30,}\\b/ },
  { name:'slack-token', re:/\\bxox[baprs]-[A-Za-z0-9-]{20,}\\b/ },
  { name:'private-key-block', re:/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { name:'secret-assignment', re:/\\b(?:API[_-]?KEY|TOKEN|SECRET|PASSWORD|PRIVATE[_-]?KEY)\\b\\s*[:=]\\s*['"]?[A-Za-z0-9_./+=-]{12,}/i },
  { name:'env-secret-export', re:/\\bexport\\s+(?:[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*)\\s*=\\s*['"]?[^\\s'"]{8,}/i }
];
function findSecretPattern(text){
  const value = String(text || '');
  for (const pattern of SECRET_VALUE_PATTERNS) {
    if (pattern.re.test(value)) return pattern.name;
  }
  return null;
}
function isSecretEnvName(name){ return /(?:TOKEN|SECRET|PASSWORD|API[_-]?KEY|PRIVATE[_-]?KEY|CREDENTIAL)/i.test(String(name || '')); }
function filteredEnv(env){
  const out = {};
  for (const [key, value] of Object.entries(env || {})) {
    if (isSecretEnvName(key) || findSecretPattern(String(value || ''))) continue;
    out[key] = value;
  }
  return out;
}
function securityFailure(reasonCode, message){
  return { ok:false, failureCategory:'security', reasonCode, message };
}
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
function listTaskCommands(task){
  return [...new Set([...(task.verifyCommands || []), ...(task.commands?.verify || [])].filter(Boolean))];
}
function validateTaskSecurity(task, runtimePolicy, plannedChangedFiles){
  const editable = task.editableScope || [];
  const forbidden = [...(task.forbiddenScope || []), ...(runtimePolicy.forbiddenWrites || [])];
  const taskSecret = findSecretPattern(stableStringify(task));
  if (taskSecret) return securityFailure('MH_SECURITY_SECRET_PATTERN', 'task packet contains secret-like content: '+taskSecret);
  if (!Array.isArray(editable) || !editable.length) return securityFailure('MH_SECURITY_INVALID_SCOPE', 'editableScope must not be empty');
  if (!Array.isArray(task.forbiddenScope) || !task.forbiddenScope.length) return securityFailure('MH_SECURITY_INVALID_SCOPE', 'forbiddenScope must not be empty');
  for (const pattern of [...editable, ...forbidden]) {
    if (scopePatternInvalid(pattern)) return securityFailure('MH_SECURITY_INVALID_SCOPE', 'invalid scope pattern: '+pattern);
  }
  for (const pattern of editable) {
    if (matchesAny(pattern, forbidden) || matchesAny(pattern.replace(/\\*+$/,''), forbidden) || forbidden.includes(pattern)) {
      return securityFailure('MH_SECURITY_SCOPE_OVERLAP', 'editableScope overlaps forbiddenScope: '+pattern);
    }
  }
  for (const changed of plannedChangedFiles) {
    if (!matchesAny(changed, editable)) return securityFailure('MH_SECURITY_EDITABLE_SCOPE_VIOLATION', 'planned write outside editableScope: '+changed);
    if (matchesAny(changed, forbidden)) return securityFailure('MH_SECURITY_FORBIDDEN_PATH', 'planned write is forbidden: '+changed);
  }
  const commands = listTaskCommands(task);
  for (const command of commands) {
    const commandSecret = findSecretPattern(command);
    if (commandSecret) return securityFailure('MH_SECURITY_SECRET_PATTERN', 'verify command contains secret-like content: '+commandSecret);
    if (commandMatches(command, runtimePolicy.commandPolicy?.deny || [])) {
      return securityFailure('MH_SECURITY_COMMAND_DENIED', 'command denied by runtime policy: '+command);
    }
    if (runtimePolicy.commandPolicy?.default === 'deny' && !commandMatches(command, runtimePolicy.commandPolicy?.allow || [])) {
      return securityFailure('MH_SECURITY_COMMAND_NOT_ALLOWED', 'command not allowed by runtime policy: '+command);
    }
  }
  return { ok:true };
}
function checkChangedFiles(changedFiles, task, runtimePolicy){
  const editable = task.editableScope || [];
  const forbidden = [...(task.forbiddenScope || []), ...(runtimePolicy.forbiddenWrites || [])];
  for (const file of changedFiles) {
    if (!matchesAny(file, editable)) return securityFailure('MH_SECURITY_CHANGED_FILE_OUTSIDE_SCOPE', 'changed file outside editableScope: '+file);
    if (matchesAny(file, forbidden)) return securityFailure('MH_SECURITY_FORBIDDEN_CHANGED_FILE', 'forbidden changed file detected: '+file);
  }
  return { ok:true };
}
function patchPaths(patch){
  const paths = [];
  for (const line of String(patch || '').split('\\n')) {
    const match = line.match(/^diff --git a\\/(.+?) b\\/(.+)$/);
    if (match) paths.push(match[1], match[2]);
  }
  return [...new Set(paths.map(normalizePath).filter(Boolean))];
}
function checkPatchArtifact(patch, task, runtimePolicy){
  const paths = patchPaths(patch);
  if (!paths.length) return { ok:true };
  return checkChangedFiles(paths, task, runtimePolicy);
}
function firstFailedCheck(...checks){
  return checks.find(check => check && !check.ok) || { ok:true };
}
function redactSecretLike(text){
  let value = String(text || '');
  for (const pattern of SECRET_VALUE_PATTERNS) {
    value = value.replace(pattern.re, '[REDACTED:'+pattern.name+']');
  }
  return value;
}
function sanitizeVerify(verify){
  return (verify || []).map(item => ({ ...item, output: redactSecretLike(item.output) }));
}
function failureCategoryFor(reasonCode, status){
  if (status !== 'failed') return undefined;
  if (String(reasonCode || '').startsWith('MH_SECURITY_')) return 'security';
  if (String(reasonCode || '').startsWith('MH_SCHEMA_')) return 'schema';
  if (String(reasonCode || '').startsWith('MH_VERIFY_')) return 'verification';
  if (String(reasonCode || '').startsWith('MH_CODEX_') || String(reasonCode || '').startsWith('MH_ADAPTER_')) return 'adapter';
  return 'execution';
}
function writeRunArtifacts({ runDir, runId, adapter, task, status, failureCategory, reasonCode, message, changedFiles = [], verify = [], patch = '', mode, tmpDir, targetRoot, extraArtifacts = [] }){
  const safeVerify = sanitizeVerify(verify);
  const safeMessage = redactSecretLike(message || '');
  const safePatch = redactSecretLike(patch);
  write(path.join(runDir,'patch.diff'), safePatch);
  const artifacts = [...new Set(['patch.diff','run-result.json','summary.md','sanitized-signal.json', ...extraArtifacts])];
  const result = {
    schemaVersion: '1.0.0',
    runId,
    adapter,
    taskId: task.taskId,
    taskType: task.taskType || 'unknown',
    generatorVersion: readGeneratorVersion(targetRoot),
    status,
    failureCategory: failureCategory || failureCategoryFor(reasonCode, status),
    reasonCode,
    message: safeMessage || undefined,
    changedFiles,
    verify: safeVerify,
    artifacts,
    startedAt: new Date().toISOString(),
    execution: { profile: 'L0_LOCAL_WORKTREE', mode, worktreePath: mode === 'git-worktree' ? path.relative(targetRoot, tmpDir) : null },
    notes: status === 'failed' && reasonCode?.startsWith('MH_SECURITY_') ? 'Security policy blocked the run before success was recorded.' : (mode === 'git-worktree'
      ? 'L0 git worktree adapter run.'
      : (mode === 'not-started' ? 'Adapter did not start execution.' : 'Fallback adapter run. Used when git is unavailable or the target is not an initialized git repo.'))
  };
  const artifactSecret = findSecretPattern(stableStringify(result)) || findSecretPattern(safePatch);
  if (artifactSecret && !reasonCode?.startsWith('MH_SECURITY_')) {
    result.status = 'failed';
    result.failureCategory = 'security';
    result.reasonCode = 'MH_SECURITY_SECRET_PATTERN';
    result.message = 'run artifacts contain secret-like content: '+artifactSecret;
  }
  write(path.join(runDir,'run-result.json'), JSON.stringify(result,null,2)+'\\n');
  write(path.join(runDir,'sanitized-signal.json'), JSON.stringify(buildSanitizedSignal(result, safePatch.split(/\\r?\\n/).length - 1),null,2)+'\\n');
  write(path.join(runDir,'summary.md'), \`# Harness Run Summary

- Run ID: \${runId}
- Task: \${task.taskId}
- Adapter: \${adapter}
- Status: \${result.status}
- Failure category: \${result.failureCategory || 'n/a'}
- Reason: \${result.reasonCode || 'n/a'}
- Execution: \${mode}
- Changed files: \${result.changedFiles.join(', ')}

## Objective

\${task.objective || ''}

## Verify

\${safeVerify.length ? safeVerify.map(v => '- '+v.command+': '+v.status).join('\\n') : '- not run'}
\`);
  return result;
}
function cleanupWorktree(targetRoot, tmpDir, mode){
  if (mode === 'git-worktree') {
    try { execSync('git worktree remove --force '+JSON.stringify(tmpDir), { cwd: targetRoot, stdio: ['ignore','ignore','ignore'] }); } catch {}
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
function readAdaptersConfig(targetRoot){
  const configPath = path.join(targetRoot,'.harness','agents','adapters.yml');
  const config = {
    defaultAdapter: 'shell',
    adapters: {
      shell: { enabled: true, type: 'local-shell-mvp', implementation: 'builtin:shell' },
      codex: { enabled: true, type: 'codex-exec', implementation: 'builtin:codex', binary: 'codex' },
      claude: { enabled: false, type: 'claude-code', implementation: 'placeholder' },
      openhands: { enabled: false, type: 'openhands', implementation: 'placeholder' }
    }
  };
  if (!fs.existsSync(configPath)) return config;
  const lines = fs.readFileSync(configPath,'utf8').split(/\\r?\\n/);
  let inAdapters = false;
  let current = null;
  for (const line of lines) {
    if (/^defaultAdapter:\\s*/.test(line)) {
      config.defaultAdapter = line.split(':').slice(1).join(':').trim();
      continue;
    }
    if (/^adapters:\\s*$/.test(line)) { inAdapters = true; current = null; continue; }
    if (!inAdapters) continue;
    const adapterMatch = line.match(/^\\s{2}([a-zA-Z0-9_-]+):\\s*$/);
    if (adapterMatch) {
      current = adapterMatch[1];
      config.adapters[current] = config.adapters[current] || {};
      continue;
    }
    const propMatch = line.match(/^\\s{4}([a-zA-Z0-9_-]+):\\s*(.*)$/);
    if (current && propMatch) {
      const key = propMatch[1];
      const rawValue = propMatch[2].trim().replace(/^["']|["']$/g, '');
      config.adapters[current][key] = rawValue === 'true' ? true : rawValue === 'false' ? false : rawValue;
    }
  }
  return config;
}
function assertAdapterInterface(name, adapterModule){
  const methods = ['prepare','execute','collectArtifacts','summarize'];
  for (const method of methods) {
    if (typeof adapterModule?.[method] !== 'function') throw new Error('adapter '+name+' missing method: '+method);
  }
}
function createDisabledAdapter(name){
  return {
    prepare(){ throw new Error('adapter '+name+' is disabled placeholder only'); },
    execute(){ throw new Error('adapter '+name+' is disabled placeholder only'); },
    collectArtifacts(){ throw new Error('adapter '+name+' is disabled placeholder only'); },
    summarize(){ throw new Error('adapter '+name+' is disabled placeholder only'); }
  };
}
const shellAdapter = {
  prepare(ctx){
    const changedPath = path.join('apps','web','src','generated',safe(ctx.task.taskId || 'task') + '.ts');
    const preflight = validateTaskSecurity(ctx.task, ctx.runtimePolicy, [changedPath]);
    if (!preflight.ok) return { ok:false, changedPath, mode:'not-started', reasonCode:preflight.reasonCode, message:preflight.message };

    let executionDir = ctx.targetRoot;
    let mode = 'fallback';
    if (isGitRepo(ctx.targetRoot)) {
      try {
        execSync('git worktree add --detach '+JSON.stringify(ctx.tmpDir)+' HEAD', { cwd: ctx.targetRoot, stdio: ['ignore','pipe','pipe'] });
        executionDir = ctx.tmpDir;
        mode = 'git-worktree';
      } catch {
        ensureDir(ctx.tmpDir);
      }
    } else {
      ensureDir(ctx.tmpDir);
    }
    const beforeFiles = mode === 'fallback' ? walkProjectFiles(executionDir) : [];

    const content = \`export const generatedTask = {
  taskId: "\${ctx.task.taskId || 'unknown'}",
  objective: "\${String(ctx.task.objective || '').replace(/"/g, '\\\\"')}",
  generatedBy: "shell-adapter",
  generatedAt: "\${new Date().toISOString()}"
};
\`;
    return { ok:true, changedPath, executionDir, mode, content, beforeFiles };
  },
  execute(ctx, prepared){
    write(path.join(prepared.executionDir, prepared.changedPath), prepared.content);
    return { verify: (ctx.task.commands?.verify || []).map(command => run(command, prepared.executionDir, ctx.workerEnv)) };
  },
  collectArtifacts(ctx, prepared, executed){
    const patch = prepared.mode === 'git-worktree'
      ? collectGitPatch(prepared.executionDir, prepared.changedPath, prepared.content)
      : createPatchForFile(prepared.changedPath, prepared.content);
    const changedFiles = prepared.mode === 'git-worktree'
      ? changedFilesFromStatus(prepared.executionDir)
      : [...new Set([prepared.changedPath, ...changedFilesFromSnapshot(prepared.executionDir, prepared.beforeFiles)])];
    const changedCheck = checkChangedFiles(changedFiles.length ? changedFiles : [prepared.changedPath], ctx.task, ctx.runtimePolicy);
    const patchCheck = checkPatchArtifact(patch, ctx.task, ctx.runtimePolicy);
    return { patch, changedFiles: changedFiles.length ? changedFiles : [prepared.changedPath], changedCheck: firstFailedCheck(changedCheck, patchCheck), verify: executed.verify };
  },
  summarize(ctx, prepared, collected){
    const failed = collected.verify.filter(x => x.status !== 'passed');
    return writeRunArtifacts({
      runDir: ctx.runDir,
      runId: ctx.runId,
      adapter: ctx.adapterName,
      task: ctx.task,
      status: failed.length || !collected.changedCheck.ok ? 'failed' : 'passed',
      reasonCode: !collected.changedCheck.ok ? collected.changedCheck.reasonCode : (failed.length ? 'MH_VERIFY_FAILED' : undefined),
      message: !collected.changedCheck.ok ? collected.changedCheck.message : undefined,
      changedFiles: collected.changedFiles,
      verify: collected.verify,
      patch: collected.patch,
      mode: prepared.mode,
      tmpDir: ctx.tmpDir,
      targetRoot: ctx.targetRoot
    });
  }
};
const codexAdapter = {
  prepare(ctx){
    const preflight = validateTaskSecurity(ctx.task, ctx.runtimePolicy, []);
    if (!preflight.ok) return { ok:false, mode:'not-started', reasonCode:preflight.reasonCode, message:preflight.message };

    const binary = process.env.MH_CODEX_BINARY || ctx.adapterConfig.binary || 'codex';
    if (!binaryExists(binary)) {
      return {
        ok:false,
        mode:'not-started',
        reasonCode:'MH_CODEX_BINARY_NOT_FOUND',
        message:'codex binary not found. Install Codex CLI or set MH_CODEX_BINARY to an executable.'
      };
    }

    let executionDir = ctx.targetRoot;
    let mode = 'fallback';
    if (isGitRepo(ctx.targetRoot)) {
      try {
        execSync('git worktree add --detach '+JSON.stringify(ctx.tmpDir)+' HEAD', { cwd: ctx.targetRoot, stdio: ['ignore','pipe','pipe'] });
        executionDir = ctx.tmpDir;
        mode = 'git-worktree';
      } catch {
        ensureDir(ctx.tmpDir);
      }
    } else {
      ensureDir(ctx.tmpDir);
    }

    const agentsPath = path.join(executionDir, 'AGENTS.md');
    const agentsText = fs.existsSync(agentsPath) ? fs.readFileSync(agentsPath,'utf8') : '';
    const prompt = buildCodexPrompt({ task: ctx.task, agentsText });
    write(path.join(ctx.runDir,'codex-prompt.md'), prompt);
    return { ok:true, binary, executionDir, mode, prompt };
  },
  execute(ctx, prepared){
    const args = ['exec', '--cd', prepared.executionDir, '--yolo', '-'];
    const command = prepared.binary + ' ' + args.join(' ');
    const started = Date.now();
    const child = spawnSync(prepared.binary, args, {
      cwd: prepared.executionDir,
      input: prepared.prompt,
      encoding: 'utf8',
      stdio: ['pipe','pipe','pipe'],
      env: ctx.workerEnv,
      maxBuffer: 1024 * 1024 * 20
    });
    const output = (child.stdout || '') + (child.stderr || '') + (child.error ? child.error.message : '');
    write(path.join(ctx.runDir,'codex-output.log'), output);
    return {
      command,
      status: child.status === 0 && !child.error ? 'passed' : 'failed',
      output,
      durationMs: Date.now() - started,
      exitCode: child.status,
      error: child.error?.message
    };
  },
  collectArtifacts(ctx, prepared, executed){
    const changedFiles = prepared.mode === 'git-worktree' ? changedFilesFromStatus(prepared.executionDir) : [];
    const patch = prepared.mode === 'git-worktree' ? collectGitPatchAll(prepared.executionDir, changedFiles) : '';
    const changedCheck = checkChangedFiles(changedFiles, ctx.task, ctx.runtimePolicy);
    const patchCheck = checkPatchArtifact(patch, ctx.task, ctx.runtimePolicy);
    return { patch, changedFiles, changedCheck: firstFailedCheck(changedCheck, patchCheck), executed };
  },
  summarize(ctx, prepared, collected){
    return writeRunArtifacts({
      runDir: ctx.runDir,
      runId: ctx.runId,
      adapter: ctx.adapterName,
      task: ctx.task,
      status: collected.executed.status !== 'passed' || !collected.changedCheck.ok ? 'failed' : 'passed',
      reasonCode: !collected.changedCheck.ok ? collected.changedCheck.reasonCode : (collected.executed.status !== 'passed' ? 'MH_CODEX_EXEC_FAILED' : undefined),
      message: !collected.changedCheck.ok ? collected.changedCheck.message : collected.executed.error,
      changedFiles: collected.changedFiles,
      verify: [{ command: collected.executed.command, status: collected.executed.status, output: collected.executed.output }],
      patch: collected.patch,
      mode: prepared.mode,
      tmpDir: ctx.tmpDir,
      targetRoot: ctx.targetRoot,
      extraArtifacts: ['codex-prompt.md','codex-output.log']
    });
  }
};
const ADAPTER_IMPLEMENTATIONS = {
  shell: shellAdapter,
  codex: codexAdapter,
  claude: createDisabledAdapter('claude'),
  openhands: createDisabledAdapter('openhands')
};

const opts = parse(process.argv.slice(2));
const taskPath = opts.task || '.harness/tasks/example.task.json';
if(!fs.existsSync(taskPath)){ console.error('[runner:error] task file not found: '+taskPath); process.exit(1); }
const task = readJson(taskPath);
const targetRoot = process.cwd();
const { runId, runDir, tmpDir } = createRunLayout(targetRoot, task.taskId || 'task');
ensureDir(runDir); ensureDir(path.dirname(tmpDir));
const runtimePolicy = readRuntimePolicy(targetRoot);
const adapterConfig = readAdaptersConfig(targetRoot);
const adapterName = opts.adapter || adapterConfig.defaultAdapter || 'shell';
const selectedAdapterConfig = adapterConfig.adapters?.[adapterName];
const adapterModule = ADAPTER_IMPLEMENTATIONS[adapterName];
if (!selectedAdapterConfig || !adapterModule) {
  writeRunArtifacts({ runDir, runId, adapter: adapterName, task, status:'failed', reasonCode:'MH_ADAPTER_NOT_FOUND', message:'adapter is not configured: '+adapterName, mode:'not-started', tmpDir, targetRoot });
  console.error('[runner:adapter] MH_ADAPTER_NOT_FOUND: adapter is not configured: '+adapterName);
  process.exit(1);
}
assertAdapterInterface(adapterName, adapterModule);
if (selectedAdapterConfig.enabled !== true) {
  writeRunArtifacts({ runDir, runId, adapter: adapterName, task, status:'failed', reasonCode:'MH_ADAPTER_DISABLED', message:'adapter is disabled placeholder only: '+adapterName, mode:'not-started', tmpDir, targetRoot });
  console.error('[runner:adapter] MH_ADAPTER_DISABLED: adapter is disabled placeholder only: '+adapterName);
  process.exit(1);
}

const ctx = { runId, runDir, tmpDir, task, targetRoot, runtimePolicy, adapterName, adapterConfig: selectedAdapterConfig, workerEnv: filteredEnv(process.env) };
const prepared = adapterModule.prepare(ctx);
if (!prepared.ok) {
  writeRunArtifacts({ runDir, runId, adapter: adapterName, task, status:'failed', reasonCode:prepared.reasonCode, message:prepared.message, mode:prepared.mode || 'not-started', tmpDir, targetRoot });
  console.error('['+(prepared.reasonCode?.startsWith('MH_SECURITY_') ? 'runner:security' : 'runner:adapter')+'] '+prepared.reasonCode+': '+prepared.message);
  process.exit(1);
}
const executed = adapterModule.execute(ctx, prepared);
const collected = adapterModule.collectArtifacts(ctx, prepared, executed);
const result = adapterModule.summarize(ctx, prepared, collected);

if (opts.cleanup !== 'false') {
  cleanupWorktree(targetRoot, tmpDir, prepared.mode);
}
if (result.status === 'failed') {
  console.error('['+(result.reasonCode?.startsWith('MH_SECURITY_') ? 'runner:security' : 'runner:adapter')+'] '+(result.reasonCode || 'MH_RUN_FAILED')+': '+(result.message || 'run failed'));
  process.exit(1);
}
console.log('[ok] harness run completed: '+runDir);
`; }
