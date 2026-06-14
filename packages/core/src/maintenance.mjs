import path from 'node:path';
import { assertContractFile } from './contracts.mjs';
import { abs, ensureDir, exists, readJson, writeJson, writeText } from './fs-utils.mjs';

export const MAINTENANCE_TASK_TYPES = {
  dependency: {
    taskType: 'maintenance-dependency',
    title: 'Dependency Update',
    editableScope: ['package.json', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'apps/**', 'packages/**', 'tests/**', 'docs/**'],
    verifyCommands: ['npm test', 'npm run lint --if-present', 'npm run typecheck --if-present']
  },
  security: {
    taskType: 'maintenance-security',
    title: 'Security Triage',
    editableScope: ['apps/**', 'packages/**', 'tests/**', 'docs/**', '.harness/security/**'],
    verifyCommands: ['npm test', 'npm run lint --if-present', 'npm run typecheck --if-present']
  },
  bugfix: {
    taskType: 'maintenance-bugfix',
    title: 'Bugfix',
    editableScope: ['apps/**', 'packages/**', 'tests/**', 'docs/**'],
    verifyCommands: ['npm test', 'npm run lint --if-present']
  },
  incident: {
    taskType: 'maintenance-incident',
    title: 'Incident Response',
    editableScope: ['apps/**', 'packages/**', 'tests/**', 'docs/operations/**', '.harness/maintenance/**'],
    verifyCommands: ['npm test', 'npm run lint --if-present']
  }
};

export const DEFAULT_MAINTENANCE_FORBIDDEN_SCOPE = [
  '.env*',
  '**/*.pem',
  '**/*secret*',
  '**/*token*',
  'infra/**/production/**',
  '.github/workflows/deploy-prod.yml'
];

export function defaultMaintenanceConfigContent() {
  const typeLines = Object.entries(MAINTENANCE_TASK_TYPES)
    .map(([id, item]) => `  ${id}:
    taskType: ${item.taskType}
    template: .harness/maintenance/templates/${id}.task-template.json
    defaultVerifyCommands:
${item.verifyCommands.map(command => `      - ${command}`).join('\n')}`)
    .join('\n');
  return `schemaVersion: 1
maintenance:
  backlog: .harness/maintenance/backlog.items.json
  taskOutputDir: .harness/tasks
  incidentReportTemplate: docs/operations/incident-report.md
  postmortemTemplate: docs/operations/postmortem.md
  rawProjectDataPolicy: target-owned
taskTypes:
${typeLines}
forbiddenScope:
${DEFAULT_MAINTENANCE_FORBIDDEN_SCOPE.map(pattern => `  - ${pattern}`).join('\n')}
`;
}

export function maintenanceTaskTypesJson() {
  return {
    schemaVersion: '1.0.0',
    taskTypes: Object.fromEntries(
      Object.entries(MAINTENANCE_TASK_TYPES).map(([id, item]) => [id, {
        taskType: item.taskType,
        title: item.title,
        defaultEditableScope: item.editableScope,
        defaultForbiddenScope: DEFAULT_MAINTENANCE_FORBIDDEN_SCOPE,
        defaultVerifyCommands: item.verifyCommands
      }])
    )
  };
}

export function defaultMaintenanceBacklogContent() {
  return JSON.stringify({ schemaVersion: '1.0.0', backlog: [] }, null, 2) + '\n';
}

export function maintenanceTaskTemplate(kind) {
  const type = MAINTENANCE_TASK_TYPES[kind];
  if (!type) throw new Error(`unknown maintenance kind: ${kind}`);
  return JSON.stringify({
    schemaVersion: '1.0.0',
    taskId: `MAINT-${kind.toUpperCase()}-001`,
    taskType: type.taskType,
    priority: kind === 'security' || kind === 'incident' ? 'P1' : 'P2',
    title: type.title,
    objective: `Handle a ${kind} maintenance item with scoped changes and evidence.`,
    editableScope: type.editableScope,
    forbiddenScope: DEFAULT_MAINTENANCE_FORBIDDEN_SCOPE,
    acceptanceCriteria: [
      { id: `MAINT-${kind.toUpperCase()}-AC-001`, text: 'The maintenance change is scoped, verified, and documented with target-owned evidence.' }
    ],
    verifyCommands: type.verifyCommands,
    commands: { verify: type.verifyCommands },
    budgets: { maxRuntimeMinutes: 20, maxRetries: 1, maxChangedFiles: 20, maxPatchLines: 800 },
    expectedArtifacts: ['patch.diff', 'run-result.json', 'summary.md', 'sanitized-signal.json']
  }, null, 2) + '\n';
}

export function incidentReportTemplateContent() {
  return `# Incident Report

## Summary

- Incident ID:
- Status:
- Severity:
- Started at:
- Detected by:
- Owner:

## Impact

- Affected users/systems:
- User-visible symptoms:
- Data/security impact:

## Timeline

| Time | Event | Source |
|---|---|---|
| TBD | Incident detected | TBD |

## Response

- Mitigation:
- Verification:
- Follow-up task packet:

## Evidence

Keep raw logs and project-specific evidence in the Target Repo. Do not copy secrets into this report.
`;
}

export function postmortemTemplateContent() {
  return `# Postmortem

## Incident

- Incident ID:
- Date:
- Severity:
- Owner:

## What Happened

Summarize the incident using Target Repo evidence.

## Root Cause

Describe confirmed causes and explicitly mark unknowns.

## Detection And Response

- Detection:
- Mitigation:
- Recovery:

## Preventive Actions

| Action | Owner | Due | Task Packet |
|---|---|---|---|
| TBD | TBD | TBD | TBD |

## Lessons

Record generalized learnings only. Do not export raw project data to Meta Harness.
`;
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function safeId(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '-');
}

function maintenanceTaskFileName(taskId) {
  return `${safeId(taskId)}.task.json`;
}

function normalizeKind(kind, fail) {
  const normalized = String(kind || '').trim().toLowerCase();
  if (!MAINTENANCE_TASK_TYPES[normalized]) {
    fail(`maintenance input kind must be one of: ${Object.keys(MAINTENANCE_TASK_TYPES).join(', ')}`);
  }
  return normalized;
}

export function buildMaintenanceBacklogItem(input, fail = (message) => { throw new Error(message); }) {
  const kind = normalizeKind(input.kind || input.maintenanceType || input.type, fail);
  const type = MAINTENANCE_TASK_TYPES[kind];
  const id = safeId(input.id || input.taskId || `MAINT-${kind.toUpperCase()}-001`);
  if (!id) fail('maintenance input requires id or taskId');
  const title = String(input.title || type.title).trim();
  const summary = String(input.summary || input.objective || '').trim();
  if (!summary) fail('maintenance input requires summary or objective');

  return {
    id,
    kind,
    taskType: type.taskType,
    priority: input.priority || (kind === 'security' || kind === 'incident' ? 'P1' : 'P2'),
    title,
    summary,
    packageName: input.packageName || null,
    advisoryId: input.advisoryId || null,
    incidentId: input.incidentId || null,
    severity: input.severity || null,
    acceptanceCriteria: nonEmptyArray(input.acceptanceCriteria)
      ? input.acceptanceCriteria
      : [{ id: `${id}-AC-001`, text: `${title} is resolved, verified, and documented.` }],
    editableScope: nonEmptyArray(input.editableScope) ? input.editableScope : type.editableScope,
    forbiddenScope: nonEmptyArray(input.forbiddenScope) ? input.forbiddenScope : DEFAULT_MAINTENANCE_FORBIDDEN_SCOPE,
    verifyCommands: nonEmptyArray(input.verifyCommands) ? input.verifyCommands : type.verifyCommands,
    budgets: input.budgets || { maxRuntimeMinutes: 20, maxRetries: 1, maxChangedFiles: 20, maxPatchLines: 800 },
    expectedArtifacts: nonEmptyArray(input.expectedArtifacts)
      ? input.expectedArtifacts
      : ['patch.diff', 'run-result.json', 'summary.md', 'sanitized-signal.json']
  };
}

export function maintenanceTaskPacketFromBacklogItem(item) {
  const criteria = item.acceptanceCriteria.map((criterion, index) => (
    typeof criterion === 'string'
      ? { id: `${item.id}-AC-${String(index + 1).padStart(3, '0')}`, text: criterion }
      : { id: criterion.id || `${item.id}-AC-${String(index + 1).padStart(3, '0')}`, text: criterion.text }
  ));
  return {
    schemaVersion: '1.0.0',
    taskId: item.id,
    taskType: item.taskType,
    priority: item.priority,
    title: item.title,
    objective: item.summary,
    editableScope: item.editableScope,
    forbiddenScope: item.forbiddenScope,
    acceptanceCriteria: criteria,
    verifyCommands: item.verifyCommands,
    commands: { verify: item.verifyCommands },
    budgets: item.budgets,
    expectedArtifacts: item.expectedArtifacts,
    maintenance: {
      kind: item.kind,
      packageName: item.packageName,
      advisoryId: item.advisoryId,
      incidentId: item.incidentId,
      severity: item.severity
    }
  };
}

export function cmdMaintenanceCreate(opts, fail) {
  const target = abs(opts.target || '.');
  if (!opts.input) fail('maintenance create requires --input <json>');
  const inputPath = abs(opts.input);
  if (!exists(inputPath)) fail(`maintenance input file not found: ${inputPath}`);
  assertContractFile('maintenanceInput', inputPath, fail);

  const input = readJson(inputPath);
  const item = buildMaintenanceBacklogItem(input, fail);
  const taskPacket = maintenanceTaskPacketFromBacklogItem(item);

  const maintenanceDir = path.join(target, '.harness/maintenance');
  const tasksDir = path.join(target, '.harness/tasks');
  ensureDir(maintenanceDir);
  ensureDir(tasksDir);

  const backlogPath = path.join(maintenanceDir, 'backlog.items.json');
  const currentBacklog = exists(backlogPath) ? readJson(backlogPath) : { schemaVersion: '1.0.0', backlog: [] };
  const withoutDuplicate = (currentBacklog.backlog || []).filter(existing => existing.id !== item.id);
  currentBacklog.schemaVersion = currentBacklog.schemaVersion || '1.0.0';
  currentBacklog.backlog = [...withoutDuplicate, item];
  writeJson(backlogPath, currentBacklog);

  const taskPath = path.join(tasksDir, maintenanceTaskFileName(item.id));
  writeJson(taskPath, taskPacket);
  assertContractFile('taskPacket', taskPath, fail);
  return `maintenance backlog item created: ${path.relative(target, taskPath)}`;
}
