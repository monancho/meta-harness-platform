#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredStatic = [
  'AGENTS.md',
  'CLAUDE.md',
  'docs/AGENT_START_HERE.md',
  'docs/AGENT_TASK_INDEX.md',
  'docs/AGENT_READY_STRUCTURE.md',
  'docs/FULL_HARNESS_BACKLOG.md',
  'docs/TEST_SPEC.md',
  '.harness/agent-workspace/README.md',
  '.harness/agent-workspace/backlog.yml',
  '.harness/agent-workspace/quality-gates.yml',
  '.harness/agent-workspace/policies/editable-scope.yml',
  '.harness/agent-workspace/policies/forbidden-scope.yml',
  '.harness/agent-workspace/policies/command-policy.yml',
  '.harness/agent-workspace/contracts/output-contract.md',
  '.codex/prompts/start-next-task.md',
  'templates/target-repo/AGENTS.md',
  'templates/target-repo/CLAUDE.md',
  'bin/mh.mjs',
  'tests/smoke.sh'
];

const missingStatic = requiredStatic.filter((p) => !fs.existsSync(path.join(root, p)));
if (missingStatic.length) {
  console.error('[agent-ready:error] missing files:');
  for (const m of missingStatic) console.error(' - ' + m);
  process.exit(1);
}

const taskDir = path.join(root, '.harness/agent-workspace/tasks');
const taskFiles = fs.readdirSync(taskDir).filter((f) => /^MH-\d{3}-.+\.task\.json$/.test(f)).sort();
const expectedIds = Array.from({ length: 28 }, (_, i) => `MH-${String(i + 1).padStart(3, '0')}`);
const byId = new Map();

for (const file of taskFiles) {
  const rel = `.harness/agent-workspace/tasks/${file}`;
  const task = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const requiredFields = ['schemaVersion', 'taskId', 'taskType', 'priority', 'title', 'objective', 'editableScope', 'forbiddenScope', 'acceptanceCriteria', 'commands', 'expectedArtifacts'];
  const missingFields = requiredFields.filter((k) => !(k in task));
  if (missingFields.length) {
    console.error(`[agent-ready:error] ${rel} missing fields: ${missingFields.join(', ')}`);
    process.exit(1);
  }
  byId.set(task.taskId, { file, task });
}

for (const id of expectedIds) {
  if (!byId.has(id)) {
    console.error(`[agent-ready:error] missing task packet for ${id}`);
    process.exit(1);
  }
}

const backlog = fs.readFileSync(path.join(root, '.harness/agent-workspace/backlog.yml'), 'utf8');
for (const id of expectedIds) {
  if (!backlog.includes(`- ${id}`) || !backlog.includes(`id: ${id}`)) {
    console.error(`[agent-ready:error] backlog.yml does not reference ${id}`);
    process.exit(1);
  }
}

const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
const expectedPhrases = [
  'Meta Harness Platform',
  'Target Repo',
  'Planning-first',
  'L0',
  'MH-001',
  'MH-028'
];
for (const phrase of expectedPhrases) {
  if (!agents.includes(phrase)) {
    console.error('[agent-ready:error] AGENTS.md missing expected phrase: ' + phrase);
    process.exit(1);
  }
}

console.log('[ok] agent-ready structure is valid');
console.log('[ok] task queue: MH-001 → MH-028');
console.log('[ok] Korean-friendly AGENTS.md detected');
console.log('[ok] recommended first task: .harness/agent-workspace/tasks/MH-001-repository-restructure.task.json');
