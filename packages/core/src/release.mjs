import fs from 'node:fs';
import path from 'node:path';
import { abs, ensureDir, exists, readText, writeJson, writeText } from './fs-utils.mjs';
import { assertPhase } from './state.mjs';

export const RELEASE_GATE_IDS = [
  'tests',
  'build',
  'migration-notes',
  'rollback-plan',
  'env-checklist',
  'artifact-availability'
];

const RELEASE_GATE_TITLES = {
  tests: 'Tests',
  build: 'Build',
  'migration-notes': 'Migration Notes',
  'rollback-plan': 'Rollback Plan',
  'env-checklist': 'Environment Checklist',
  'artifact-availability': 'Artifact Availability'
};

const RELEASE_GATE_ACTIONS = {
  tests: 'Run the target repository test suite and attach the result path or CI link.',
  build: 'Run the release build and attach the produced build artifact path.',
  'migration-notes': 'Document required schema/data migrations or mark that none are required.',
  'rollback-plan': 'Document the exact rollback trigger, owner, and rollback command/runbook.',
  'env-checklist': 'Confirm required environment variables and runtime configuration are present without recording secret values.',
  'artifact-availability': 'Confirm the release package, changelog, and run artifacts are available.'
};

export function defaultReleaseReadinessContent() {
  const gates = RELEASE_GATE_IDS.map(id => `  - id: ${id}
    title: ${RELEASE_GATE_TITLES[id]}
    required: true
    status: todo
    evidence: []
    nextAction: ${RELEASE_GATE_ACTIONS[id]}`).join('\n');
  return `schemaVersion: 1
release:
  deploymentDefault: disabled
  packageManifest: .harness/release/release-package-manifest.json
  changelog: CHANGELOG.md
gates:
${gates}
`;
}

export function defaultReleaseGuideContent() {
  return `# Release Operations

This target repository uses the Meta Harness release skeleton to prepare release evidence without deploying by default.

## Readiness Gates

Release readiness is tracked in \`.harness/release/release-readiness.yml\`.

Required gates:

- Tests
- Build
- Migration notes
- Rollback plan
- Environment checklist
- Artifact availability

## Dry Run

Run a release dry run from the Meta Harness CLI:

\`\`\`bash
mh release dry-run --target .
\`\`\`

The dry run validates required gates, writes \`.harness/release/release-package-manifest.json\`, and prints the next actions. It does not deploy, publish, push, or mutate production infrastructure.

## Deployment Boundary

Production deployment remains a separate, explicit human-controlled step. Keep secret values out of release files and record only evidence paths, owners, and status.
`;
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === '[]') return [];
  if (/^\[.*\]$/.test(trimmed)) {
    const inner = trimmed.slice(1, -1).trim();
    return inner ? inner.split(',').map(item => item.trim().replace(/^['"]|['"]$/g, '')) : [];
  }
  return trimmed.replace(/^['"]|['"]$/g, '');
}

export function parseReleaseReadiness(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#'));
  const readiness = { schemaVersion: 1, release: {}, gates: [] };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('schemaVersion:')) readiness.schemaVersion = parseScalar(line.split(':').slice(1).join(':'));
    else if (line === 'release:') {
      for (i += 1; i < lines.length; i++) {
        const match = lines[i].match(/^  ([^:]+):\s*(.*)$/);
        if (!match) { i -= 1; break; }
        readiness.release[match[1]] = parseScalar(match[2]);
      }
    } else if (line === 'gates:') {
      for (i += 1; i < lines.length; i++) {
        const itemMatch = lines[i].match(/^  - ([^:]+):\s*(.*)$/);
        if (!itemMatch) {
          if (/^[a-zA-Z0-9_-]+:/.test(lines[i])) { i -= 1; break; }
          continue;
        }
        const gate = { [itemMatch[1]]: parseScalar(itemMatch[2]) };
        readiness.gates.push(gate);
        for (i += 1; i < lines.length; i++) {
          const fieldMatch = lines[i].match(/^    ([^:]+):\s*(.*)$/);
          if (!fieldMatch) { i -= 1; break; }
          gate[fieldMatch[1]] = parseScalar(fieldMatch[2]);
        }
      }
    }
  }
  return readiness;
}

export function missingRequiredReleaseGates(readiness) {
  const present = new Set((readiness.gates || []).map(gate => gate.id).filter(Boolean));
  return RELEASE_GATE_IDS.filter(id => !present.has(id));
}

function gateState(gate) {
  const status = String(gate.status || 'todo').toLowerCase();
  return ['pass', 'passed', 'done', 'ready'].includes(status) ? 'ready' : 'needs-action';
}

export function buildReleasePackageManifest({ target, readiness }) {
  const gates = (readiness.gates || []).map(gate => ({
    id: gate.id,
    title: gate.title || RELEASE_GATE_TITLES[gate.id] || gate.id,
    required: gate.required !== false,
    status: gate.status || 'todo',
    state: gateState(gate),
    evidence: Array.isArray(gate.evidence) ? gate.evidence : []
  }));
  const requiredGateStates = gates.filter(gate => gate.required);
  const artifacts = [
    '.harness/release/release-readiness.yml',
    'docs/operations/release.md',
    readiness.release?.changelog || 'CHANGELOG.md'
  ].map(rel => ({ path: rel, available: exists(path.join(target, rel)) }));
  return {
    schemaVersion: 1,
    mode: 'dry-run',
    deploymentPerformed: false,
    deploymentDefault: readiness.release?.deploymentDefault || 'disabled',
    packageManifest: readiness.release?.packageManifest || '.harness/release/release-package-manifest.json',
    gates,
    summary: {
      requiredGates: requiredGateStates.length,
      readyGates: requiredGateStates.filter(gate => gate.state === 'ready').length,
      blockedGates: requiredGateStates.filter(gate => gate.state !== 'ready').length
    },
    artifacts,
    nextActions: gates
      .filter(gate => gate.required && gate.state !== 'ready')
      .map(gate => ({
        gate: gate.id,
        action: RELEASE_GATE_ACTIONS[gate.id] || `Complete release gate: ${gate.title || gate.id}`
      }))
  };
}

export function cmdReleaseDryRun(opts, fail) {
  const target = abs(opts.target || '.');
  assertPhase(target, ['factory-ready', 'runnable'], 'release dry-run', fail);
  const readinessPath = path.join(target, '.harness/release/release-readiness.yml');
  if (!exists(readinessPath)) fail(`release readiness file not found: ${readinessPath}`);
  const readiness = parseReleaseReadiness(readText(readinessPath, ''));
  const missing = missingRequiredReleaseGates(readiness);
  if (missing.length > 0) fail(`missing release gates: ${missing.join(', ')}`);
  const manifest = buildReleasePackageManifest({ target, readiness });
  const manifestPath = path.join(target, manifest.packageManifest);
  ensureDir(path.dirname(manifestPath));
  writeJson(manifestPath, manifest);

  console.log('# Release Dry Run');
  console.log(`Target: ${target}`);
  console.log('Deployment performed: false');
  console.log(`Release package manifest: ${manifest.packageManifest}`);
  console.log(`Required gates: ${manifest.summary.readyGates}/${manifest.summary.requiredGates} ready`);
  console.log('');
  console.log('Required next actions:');
  if (manifest.nextActions.length === 0) {
    console.log('- No blocking release gate actions remain.');
  } else {
    for (const item of manifest.nextActions) console.log(`- [${item.gate}] ${item.action}`);
  }
  console.log('');
  console.log('Deployment is disabled by default. Review the manifest and perform deployment only through an explicit release process.');
}
