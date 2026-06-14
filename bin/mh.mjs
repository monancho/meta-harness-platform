#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const VERSION = '1.4.0-instant-devcontainer';

function log(msg = '') { console.log(msg); }
function fail(msg, code = 1) { console.error(`\n[meta-harness:error] ${msg}\n`); process.exit(code); }
function ok(msg) { console.log(`[ok] ${msg}`); }

function parse(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

function abs(p) { return path.resolve(process.cwd(), p); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function readText(p, fallback = null) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : fallback; }
function writeText(p, s) { ensureDir(path.dirname(p)); fs.writeFileSync(p, s, 'utf8'); }
function writeJson(p, obj) { writeText(p, JSON.stringify(obj, null, 2) + '\n'); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function sha(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function shaFile(p) { return sha(fs.readFileSync(p)); }
function exists(p) { return fs.existsSync(p); }
function nowId() { return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14); }

function statePath(target) { return path.join(target, '.harness/state.yml'); }
function getPhase(target) {
  const s = readText(statePath(target), '');
  const m = s.match(/phase:\s*([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
function setState(target, { projectId, phase, extra = '' }) {
  const content = `schemaVersion: 1\nprojectState:\n  projectId: ${projectId}\n  phase: ${phase}\n  updatedAt: ${new Date().toISOString()}\n${extra}`;
  writeText(statePath(target), content);
}
function readProjectId(target) {
  const txt = readText(path.join(target, '.harness/project.yml'), '');
  const m = txt.match(/id:\s*([a-zA-Z0-9_-]+)/);
  return m ? m[1] : 'demo';
}

function loadAnswers(inputPath) {
  const defaults = {
    projectName: 'Demo Project',
    projectId: 'demo',
    problem: '초기 문제 정의가 필요하다.',
    goal: '작동 가능한 MVP를 만든다.',
    targetUsers: ['초기 사용자'],
    mvpScope: ['기본 화면', '기본 데이터 구조', '기본 실행 흐름'],
    nonGoals: ['결제', '복잡한 권한', '운영용 Kubernetes'],
    primaryScreen: 'Dashboard',
    stack: { frontend: 'React', backend: 'Node/Fastify', database: 'SQLite', packageManager: 'pnpm' }
  };
  if (!inputPath) return defaults;
  const p = abs(inputPath);
  if (!exists(p)) return defaults;
  try { return { ...defaults, ...readJson(p) }; }
  catch { fail(`현재 starter는 JSON input만 지원합니다: ${p}`); }
}

function cmdDoctor() {
  log(`Meta Harness Starter v${VERSION}`);
  log(`Node: ${process.version}`);
  try { log(`Git: ${execSync('git --version', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()}`); }
  catch { log('Git: not found (L0 runner still works in fallback mode)'); }
  try { log(`Make: ${execSync('make --version', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n')[0]}`); }
  catch { log('Make: not found (you can run .harness/bin/runner.mjs directly)'); }
  ok('doctor completed');
}

function cmdScaffoldPlanning(opts) {
  const target = abs(opts.target || '../target-project');
  const projectId = opts['project-id'] || opts.projectId || 'demo';
  ensureDir(target);
  ensureDir(path.join(target, 'docs/planning'));
  ensureDir(path.join(target, '.harness/planning'));
  ensureDir(path.join(target, '.github'));

  writeText(path.join(target, 'README.md'), `# ${projectId}\n\nPlanning-first Target Project Repo.\n\n## Current phase\n\nplanning-scaffolded\n`);
  writeText(path.join(target, '.harness/project.yml'), `schemaVersion: 1\nproject:\n  id: ${projectId}\n  name: ${projectId}\n  owner: target-repo\n  sourceOfTruth:\n    planning: docs/planning\n    agentPack: .harness/planning\n`);
  setState(target, { projectId, phase: 'planning-scaffolded' });
  writeText(path.join(target, '.github/pull_request_template.md'), `## Summary\n\n## Checklist\n\n- [ ] Planning artifacts reviewed\n- [ ] Acceptance criteria are testable\n- [ ] Non-goals are clear\n`);
  writeText(path.join(target, 'docs/planning/00_IDEA_BRIEF.md'), `# 00. Idea Brief\n\n> Fill this before running planning synthesis.\n`);
  ok(`planning-only scaffold created: ${target}`);
}

function cmdPlanSynthesize(opts) {
  const target = abs(opts.target || '../target-project');
  if (!exists(statePath(target))) fail('planning scaffold가 없습니다. 먼저 scaffold planning을 실행하세요.');
  const answers = loadAnswers(opts.input);
  const projectId = readProjectId(target) || answers.projectId;
  const docs = path.join(target, 'docs/planning');
  const hp = path.join(target, '.harness/planning');
  ensureDir(docs); ensureDir(hp);

  const reqs = answers.mvpScope.map((s, i) => ({ id: `REQ-${String(i + 1).padStart(3, '0')}`, text: s, priority: i === 0 ? 'must' : 'should' }));
  const ac = reqs.map((r, i) => ({ id: `AC-${String(i + 1).padStart(3, '0')}`, requirementId: r.id, text: `${r.text} 기능은 기본 성공/빈 상태/오류 상태를 처리해야 한다.`, verification: 'test-or-manual-gate' }));
  const backlog = reqs.map((r, i) => ({ id: `BL-${String(i + 1).padStart(3, '0')}`, requirementId: r.id, title: r.text, taskType: i === 0 ? 'frontend-ui' : 'fullstack-feature', acceptanceCriteria: [ac[i].id] }));
  const screenSpecs = [{ id: 'SCREEN-001', name: answers.primaryScreen, states: ['loading', 'empty', 'error', 'success'], responsive: ['mobile', 'tablet', 'desktop'] }];

  writeText(path.join(docs, '01_CLARIFYING_QUESTIONS.md'), `# 01. Clarifying Questions\n\n- 핵심 사용자는 누구인가?\n- MVP에서 반드시 필요한 기능은 무엇인가?\n- 이번 버전에서 하지 않을 것은 무엇인가?\n`);
  writeText(path.join(docs, '02_PLANNING_ANSWERS.md'), `# 02. Planning Answers\n\n## Project\n${answers.projectName}\n\n## Problem\n${answers.problem}\n\n## Goal\n${answers.goal}\n`);
  writeText(path.join(docs, '03_PRD.md'), `# 03. PRD\n\n## Product\n${answers.projectName}\n\n## Problem\n${answers.problem}\n\n## Goal\n${answers.goal}\n\n## MVP Scope\n${answers.mvpScope.map(x => `- ${x}`).join('\n')}\n`);
  writeText(path.join(docs, '04_TARGET_USERS.md'), `# 04. Target Users\n\n${answers.targetUsers.map(x => `- ${x}`).join('\n')}\n`);
  writeText(path.join(docs, '05_MVP_SCOPE.md'), `# 05. MVP Scope\n\n${answers.mvpScope.map(x => `- ${x}`).join('\n')}\n`);
  writeText(path.join(docs, '06_NON_GOALS.md'), `# 06. Non-goals\n\n${answers.nonGoals.map(x => `- ${x}`).join('\n')}\n`);
  writeText(path.join(docs, '07_USER_STORIES.md'), `# 07. User Stories\n\n${answers.mvpScope.map((x, i) => `- US-${i + 1}: 사용자는 ${x}을/를 할 수 있다.`).join('\n')}\n`);
  writeText(path.join(docs, '08_USER_FLOWS.md'), `# 08. User Flows\n\n1. 사용자가 대시보드에 진입한다.\n2. 주요 작업을 확인한다.\n3. 항목을 생성하거나 상태를 변경한다.\n4. 결과를 확인한다.\n`);
  writeText(path.join(docs, '09_SCREEN_SPECS.md'), `# 09. Screen Specs\n\n## ${answers.primaryScreen}\n\nStates: loading / empty / error / success\n\nResponsive: mobile / tablet / desktop\n`);
  writeText(path.join(docs, '10_DESIGN_BRIEF.md'), `# 10. Design Brief\n\n- 빠른 이해가 가능한 dashboard-first UI\n- 상태별 피드백 명확화\n- 포트폴리오 설명 가능한 구조\n`);
  writeText(path.join(docs, '11_ACCEPTANCE_CRITERIA.md'), `# 11. Acceptance Criteria\n\n${ac.map(x => `- ${x.id}: ${x.text}`).join('\n')}\n`);
  writeText(path.join(docs, '12_TRACEABILITY_MATRIX.md'), `# 12. Traceability Matrix\n\n| Requirement | Acceptance Criteria | Backlog |\n|---|---|---|\n${reqs.map((r, i) => `| ${r.id} | ${ac[i].id} | ${backlog[i].id} |`).join('\n')}\n`);
  writeText(path.join(docs, '13_BACKLOG.md'), `# 13. Backlog\n\n${backlog.map(x => `- ${x.id}: ${x.title}`).join('\n')}\n`);
  writeText(path.join(docs, '14_BUILD_HANDOFF.md'), `# 14. Build Handoff\n\n## Stack\n\n- Frontend: ${answers.stack.frontend}\n- Backend: ${answers.stack.backend}\n- Database: ${answers.stack.database}\n\n## First Vertical Slice\n\n${backlog[0].title}\n`);

  const baseline = { schemaVersion: '1.0.0', projectId, projectName: answers.projectName, createdAt: new Date().toISOString(), problem: answers.problem, goal: answers.goal };
  const handoff = { schemaVersion: '1.0.0', projectId, projectName: answers.projectName, stack: answers.stack, firstVerticalSlice: backlog[0], requirements: reqs, acceptanceCriteria: ac, screenSpecs, nonGoals: answers.nonGoals };
  writeJson(path.join(hp, 'planning-baseline.json'), baseline);
  writeJson(path.join(hp, 'requirements.json'), { requirements: reqs });
  writeJson(path.join(hp, 'acceptance-criteria.json'), { acceptanceCriteria: ac });
  writeJson(path.join(hp, 'screen-specs.json'), { screens: screenSpecs });
  writeJson(path.join(hp, 'backlog.items.json'), { backlog });
  writeJson(path.join(hp, 'traceability.json'), { links: reqs.map((r, i) => ({ requirementId: r.id, acceptanceCriteriaId: ac[i].id, backlogItemId: backlog[i].id })) });
  writeText(path.join(hp, 'non-goals.policy.yml'), `nonGoals:\n${answers.nonGoals.map(x => `  - ${x}`).join('\n')}\n`);
  writeJson(path.join(hp, 'build-handoff.json'), handoff);
  ok('planning docs and agent-pack generated');
}

function cmdCompileAcceptance(opts) {
  const target = abs(opts.target || '../target-project');
  const hp = path.join(target, '.harness/planning');
  const acPath = path.join(hp, 'acceptance-criteria.json');
  if (!exists(acPath)) fail('acceptance-criteria.json이 없습니다. 먼저 plan synthesize를 실행하세요.');
  const ac = readJson(acPath).acceptanceCriteria || [];
  const tests = ac.map((item, i) => ({
    acceptanceCriteriaId: item.id,
    testId: `TEST-${String(i + 1).padStart(3, '0')}`,
    strategy: item.verification || 'test-or-manual-gate',
    suggestedCommand: `node -e \"console.log('${item.id} ok')\"`,
    manualReviewRequired: false
  }));
  writeJson(path.join(hp, 'verification-map.json'), { verificationMap: tests });
  writeJson(path.join(hp, 'acceptance-tests.generated.json'), { tests });
  ok('acceptance criteria compiled to verification-map');
}

function cmdPlanFreeze(opts) {
  const target = abs(opts.target || '../target-project');
  if (!opts.approved) fail('planning freeze requires --approved');
  const hp = path.join(target, '.harness/planning');
  const handoff = path.join(hp, 'build-handoff.json');
  if (!exists(handoff)) fail('build-handoff.json이 없습니다. 먼저 plan synthesize를 실행하세요.');
  const baseline = path.join(hp, 'planning-baseline.json');
  const projectId = readProjectId(target);
  setState(target, { projectId, phase: 'planning-frozen', extra: `  planningBaselineHash: sha256:${exists(baseline) ? shaFile(baseline) : 'missing'}\n  buildHandoffHash: sha256:${shaFile(handoff)}\n  humanApproved: true\n` });
  ok('planning baseline frozen');
}

function targetRunnerCode() { return `#!/usr/bin/env node
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
const content = \`export const generatedTask = {\n  taskId: \"\${task.taskId || 'unknown'}\",\n  objective: \"\${String(task.objective || '').replace(/\"/g, '\\\"')}\",\n  generatedBy: \"shell-adapter\",\n  generatedAt: \"\${new Date().toISOString()}\"\n};\n\`;
write(changedPath, content);

const patch = \`diff --git a/\${changedPath} b/\${changedPath}\nnew file mode 100644\n--- /dev/null\n+++ b/\${changedPath}\n@@ -0,0 +1,6 @@\n\${content.split('\\n').filter(Boolean).map(l => '+' + l).join('\\n')}\n\`;
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
write(path.join(runDir,'run-result.json'), JSON.stringify(result,null,2)+'\\n');
write(path.join(runDir,'summary.md'), \`# Harness Run Summary\n\n- Run ID: \${runId}\n- Task: \${task.taskId}\n- Adapter: \${adapter}\n- Status: \${result.status}\n- Changed file: \${changedPath}\n\n## Objective\n\n\${task.objective || ''}\n\n## Verify\n\n\${verify.map(v => '- '+v.command+': '+v.status).join('\\n')}\n\`);

if (opts.cleanup !== 'false') {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
console.log('[ok] harness run completed: '+runDir);
`; }

function cmdFactoryBootstrap(opts) {
  const target = abs(opts.target || '../target-project');
  const phase = getPhase(target);
  if (phase !== 'planning-frozen') fail(`factory bootstrap requires phase=planning-frozen. current=${phase || 'unknown'}`);
  const hp = path.join(target, '.harness/planning');
  const handoffPath = path.join(hp, 'build-handoff.json');
  if (!exists(handoffPath)) fail('build-handoff.json이 없습니다.');
  const handoff = readJson(handoffPath);
  const projectId = readProjectId(target) || handoff.projectId;
  const generated = [];
  const put = (rel, content) => { const p = path.join(target, rel); writeText(p, content); generated.push(rel); };
  const putJson = (rel, obj) => { const p = path.join(target, rel); writeJson(p, obj); generated.push(rel); };

  put('package.json', JSON.stringify({ name: projectId, version: '0.1.0', private: true, type: 'module', scripts: { test: "node -e \"console.log('test ok')\"", lint: "node -e \"console.log('lint ok')\"", typecheck: "node -e \"console.log('typecheck ok')\"" } }, null, 2) + '\n');
  put('apps/web/src/index.ts', `export const appName = ${JSON.stringify(handoff.projectName || projectId)};\n`);
  put('apps/api/src/server.ts', `export function health(){ return { ok: true }; }\n`);
  put('packages/shared/src/index.ts', `export const shared = true;\n`);
  put('packages/contracts/README.md', `# Contracts\n\nAPI contracts and shared schemas live here.\n`);
  put('infra/docker/compose.dev.yml', `services:\n  web:\n    image: node:22\n    working_dir: /workspace\n    volumes:\n      - ../../:/workspace\n    command: node -e \"console.log('dev placeholder')\"\n`);
  put('infra/docker/compose.preview.yml', `services:\n  preview:\n    image: node:22\n    working_dir: /workspace\n    volumes:\n      - ../../:/workspace\n    command: node -e \"console.log('preview placeholder')\"\n`);
  put('infra/docker/compose.prod.yml', `services:\n  app:\n    image: node:22\n    command: node -e \"console.log('prod placeholder')\"\n`);
  put('infra/caddy/Caddyfile', `:8080 {\n  respond \"Meta Harness preview placeholder\"\n}\n`);
  put('.devcontainer/devcontainer.json', JSON.stringify({ name: 'target-project-factory', image: 'mcr.microsoft.com/devcontainers/typescript-node:22', workspaceFolder: '/workspace' }, null, 2) + '\n');
  put('.codex/config.toml', `# Project-scoped Codex config placeholder\n# Keep credentials in user-level config or runtime secrets, not here.\n`);
  put('AGENTS.md', `# AGENTS.md — Target Project Factory Instructions

## Role

You are working inside a **Target Project Repo** generated by Meta Harness.
This repository is the source of truth for its own planning, code, infrastructure, CI/CD, and run artifacts.

## Required read order

1. AGENTS.md
2. .harness/state.yml
3. .harness/factory.yml
4. .harness/planning/build-handoff.json
5. .harness/planning/acceptance-criteria.json
6. The selected .harness/tasks/*.task.json
7. .harness/security/runtime-policy.yml

## Allowed behavior

- Implement only the selected task packet.
- Modify only paths in editableScope.
- Run only verification commands listed in the task packet or project scripts.
- Produce patch/report/artifacts under .harness/runs/<run-id>/.

## Forbidden behavior

Never edit:

- .env*
- infra/**/production/**
- .github/workflows/deploy-prod.yml
- long-lived credentials

Never send raw docs/code/logs to Meta Harness. Only sanitized signals are allowed.

## Definition of Done

A task is complete when:

- acceptance criteria are satisfied
- lint/typecheck/test pass or failure is reported clearly
- no forbidden path is modified
- patch.diff, run-result.json, and summary.md are produced
`);
  put('CLAUDE.md', `@AGENTS.md
`);
  put('.github/workflows/ci.yml', `name: ci\non:\n  pull_request:\n  push:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: npm test\n`);
  put('Makefile', `dev:\n\t@echo \"dev placeholder\"\n\npreview:\n\t@echo \"preview placeholder\"\n\ntest:\n\tnpm test\n\nlint:\n\tnpm run lint\n\ntypecheck:\n\tnpm run typecheck\n\nharness-run:\n\tnode .harness/bin/runner.mjs --task $(TASK) --adapter $(ADAPTER)\n`);
  put('.harness/bin/runner.mjs', targetRunnerCode());
  fs.chmodSync(path.join(target, '.harness/bin/runner.mjs'), 0o755);
  put('.harness/factory.yml', `schemaVersion: 1\nfactory:\n  id: ${projectId}\n  version: 0.1.0\n  generatedBy: meta-harness-platform-starter\n  generatorVersion: ${VERSION}\ngeneratedFrom:\n  buildHandoff: .harness/planning/build-handoff.json\n  buildHandoffHash: sha256:${shaFile(handoffPath)}\ncapabilities:\n  planning: true\n  bootstrap: true\n  mvpBuild: true\n  localWorktreeRunner: true\n  localTaskKubernetes: false\n  githubActions: true\n`);
  put('.harness/execution-profiles.yml', `defaultProfile: L0_LOCAL_WORKTREE\nprofiles:\n  L0_LOCAL_WORKTREE:\n    isolation:\n      filesystem: git-worktree-or-fallback\n      network: inherited-restricted\n      secrets: filtered-env\n    artifacts:\n      - patch.diff\n      - run-result.json\n      - summary.md\n  L1_CONTAINER_WORKER:\n    enabled: false\n  L2_KIND_NAMESPACE:\n    enabled: false\n  L3_GITHUB_ACTION:\n    enabled: false\n`);
  put('.harness/agents/adapters.yml', `defaultAdapter: shell\nadapters:\n  shell:\n    enabled: true\n    type: local-shell-mvp\n  codex:\n    enabled: false\n    type: codex-exec\n  claude:\n    enabled: false\n    type: claude-code\n  openhands:\n    enabled: false\n    type: openhands\n`);
  put('.harness/security/runtime-policy.yml', `phases:\n  setup:\n    network:\n      default: deny\n      allow:\n        - registry.npmjs.org\n        - api.github.com\n  worker:\n    network:\n      default: deny\n    forbiddenWrites:\n      - .env*\n      - infra/**/production/**\n      - .github/workflows/deploy-prod.yml\n`);
  put('.harness/budgets.yml', `budgets:\n  default:\n    maxRuntimeMinutes: 20\n    maxRetries: 1\n    maxChangedFiles: 20\n    maxPatchLines: 800\n`);
  putJson('.harness/tasks/example.task.json', {
    schemaVersion: '1.0.0',
    taskId: 'ISSUE-001',
    taskType: 'frontend-ui',
    objective: 'Create a small generated frontend feature file to prove the harness run loop.',
    editableScope: ['apps/web/src/**', 'packages/shared/**', 'docs/**', 'tests/**'],
    forbiddenScope: ['.env*', 'infra/**/production/**', '.github/workflows/deploy-prod.yml'],
    acceptanceCriteria: [{ id: 'AC-001', text: 'The harness run creates patch.diff, run-result.json, and summary.md.' }],
    commands: { verify: ["node -e \"console.log('lint ok')\"", "node -e \"console.log('typecheck ok')\"", "node -e \"console.log('test ok')\""] },
    expectedArtifacts: ['patch.diff', 'run-result.json', 'summary.md']
  });
  ensureDir(path.join(target, '.harness/runs'));
  ensureDir(path.join(target, '.harness/tmp'));

  const manifestFiles = generated.map(rel => ({ path: rel, ownership: rel.includes('AGENTS.md') || rel.includes('.github') ? 'shared' : 'harness', checksum: `sha256:${shaFile(path.join(target, rel))}`, mergeStrategy: rel.includes('infra/caddy') ? 'propose-only' : 'replace-if-unchanged' }));
  writeJson(path.join(target, '.harness/manifest.lock'), { schemaVersion: 1, factoryId: projectId, generator: { name: 'meta-harness-platform-starter', version: VERSION }, source: { buildHandoff: '.harness/planning/build-handoff.json', buildHandoffHash: `sha256:${shaFile(handoffPath)}` }, files: manifestFiles });
  setState(target, { projectId, phase: 'factory-ready', extra: `  factoryManifestHash: sha256:${shaFile(path.join(target, '.harness/manifest.lock'))}\n` });
  ok(`Project Factory bootstrapped: ${target}`);
}

function cmdRun(opts) {
  const target = abs(opts.target || '.');
  const runner = path.join(target, '.harness/bin/runner.mjs');
  if (!exists(runner)) fail('runner not found. Run factory bootstrap first.');
  const task = opts.task || '.harness/tasks/example.task.json';
  const adapter = opts.adapter || 'shell';
  execSync(`node ${JSON.stringify(runner)} --task ${JSON.stringify(task)} --adapter ${JSON.stringify(adapter)}`, { cwd: target, stdio: 'inherit' });
}

function usage() {
  log(`Meta Harness Starter v${VERSION}\n\nCommands:\n  doctor\n  scaffold planning --target <dir> --project-id <id>\n  plan synthesize --target <dir> --input <json>\n  plan compile-acceptance --target <dir>\n  plan freeze --target <dir> --approved\n  factory bootstrap --target <dir>\n  run --target <dir> --task <task.json> --adapter shell\n`);
}

const opts = parse(process.argv.slice(2));
const [a, b] = opts._;
if (!a || a === 'help' || a === '--help') usage();
else if (a === 'doctor') cmdDoctor(opts);
else if (a === 'scaffold' && b === 'planning') cmdScaffoldPlanning(opts);
else if (a === 'plan' && b === 'synthesize') cmdPlanSynthesize(opts);
else if (a === 'plan' && b === 'compile-acceptance') cmdCompileAcceptance(opts);
else if (a === 'plan' && b === 'freeze') cmdPlanFreeze(opts);
else if (a === 'factory' && b === 'bootstrap') cmdFactoryBootstrap(opts);
else if (a === 'run') cmdRun(opts);
else fail(`unknown command: ${opts._.join(' ')}`);
