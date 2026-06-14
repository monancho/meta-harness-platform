import path from 'node:path';
import { VERSION } from './constants.mjs';
import { exists, readJson, readText, shaFile, writeJson } from './fs-utils.mjs';
import { managedBlockMetadata } from './managed-blocks.mjs';

export const DEFAULT_CONFLICT_POLICY = 'fail-on-drift';

const SECRET_PATH_PATTERNS = [
  /^\.env(?:\.|$)/,
  /(^|\/)[^/]*(secret|token)[^/]*$/i,
  /\.pem$/i,
  /^infra\/.*\/production(?:\/|$)/,
  /^\.github\/workflows\/deploy-prod\.yml$/
];

function normalizeRelPath(rel) {
  return rel.split(path.sep).join('/');
}

export function isSecretOrForbiddenManagedPath(rel) {
  const normalized = normalizeRelPath(rel);
  return SECRET_PATH_PATTERNS.some(pattern => pattern.test(normalized));
}

export function ownershipForManagedPath(rel) {
  const normalized = normalizeRelPath(rel);
  if (normalized === 'AGENTS.md' || normalized.startsWith('.github/workflows/')) return 'shared';
  if (normalized.startsWith('infra/caddy/')) return 'target';
  return 'harness';
}

export function mergeStrategyForManagedPath(rel) {
  const normalized = normalizeRelPath(rel);
  if (normalized.startsWith('infra/caddy/')) return 'propose-only';
  if (normalized === 'AGENTS.md' || normalized.startsWith('.github/workflows/')) return 'managed-blocks';
  return 'replace-if-unchanged';
}

export function conflictPolicyForManagedPath(rel) {
  const normalized = normalizeRelPath(rel);
  if (normalized.startsWith('infra/caddy/')) return 'open-upgrade-proposal';
  return DEFAULT_CONFLICT_POLICY;
}

export function createManagedFileEntry(target, rel) {
  const normalized = normalizeRelPath(rel);
  const entry = {
    path: normalized,
    ownership: ownershipForManagedPath(normalized),
    checksum: `sha256:${shaFile(path.join(target, normalized))}`,
    mergeStrategy: mergeStrategyForManagedPath(normalized),
    conflictPolicy: conflictPolicyForManagedPath(normalized)
  };
  if (entry.mergeStrategy === 'managed-blocks') {
    entry.managedBlocks = managedBlockMetadata(readText(path.join(target, normalized), ''));
  }
  return entry;
}

export function buildManifest({ target, projectId, handoffPath, generated, answersPath }) {
  const managedFiles = generated
    .map(normalizeRelPath)
    .filter(rel => !isSecretOrForbiddenManagedPath(rel))
    .sort()
    .map(rel => createManagedFileEntry(target, rel));

  const answers = {
    planningAnswers: 'docs/planning/02_PLANNING_ANSWERS.md'
  };
  if (answersPath && exists(answersPath)) {
    answers.planningBaseline = '.harness/planning/planning-baseline.json';
    answers.planningBaselineHash = `sha256:${shaFile(answersPath)}`;
  }

  return {
    schemaVersion: 1,
    factoryId: projectId,
    generator: {
      name: 'meta-harness-platform-starter',
      version: VERSION
    },
    source: {
      buildHandoff: '.harness/planning/build-handoff.json',
      buildHandoffHash: `sha256:${shaFile(handoffPath)}`
    },
    answers,
    defaults: {
      conflictPolicy: DEFAULT_CONFLICT_POLICY
    },
    managedFiles,
    files: managedFiles
  };
}

export function writeManifestLock({ target, projectId, handoffPath, generated }) {
  const manifestPath = path.join(target, '.harness/manifest.lock');
  const answersPath = path.join(target, '.harness/planning/planning-baseline.json');
  const manifest = buildManifest({ target, projectId, handoffPath, generated, answersPath });
  writeJson(manifestPath, manifest);
  return manifestPath;
}

export function checkManagedFiles(target) {
  const manifestPath = path.join(target, '.harness/manifest.lock');
  if (!exists(manifestPath)) {
    return {
      ok: false,
      manifestPath,
      changed: [],
      missing: [],
      errors: ['manifest.lock not found']
    };
  }

  const manifest = readJson(manifestPath);
  const managedFiles = manifest.managedFiles || manifest.files || [];
  const changed = [];
  const missing = [];

  for (const item of managedFiles) {
    if (!item || !item.path || !item.checksum) continue;
    const filePath = path.join(target, item.path);
    if (!exists(filePath)) {
      missing.push(item.path);
      continue;
    }
    const actual = `sha256:${shaFile(filePath)}`;
    if (actual !== item.checksum) {
      changed.push({
        path: item.path,
        expected: item.checksum,
        actual,
        ownership: item.ownership,
        mergeStrategy: item.mergeStrategy,
        conflictPolicy: item.conflictPolicy || manifest.defaults?.conflictPolicy || DEFAULT_CONFLICT_POLICY
      });
    }
  }

  return {
    ok: changed.length === 0 && missing.length === 0,
    manifestPath,
    changed,
    missing,
    errors: []
  };
}

export function cmdManifestCheck(opts, fail) {
  const target = path.resolve(process.cwd(), opts.target || '../target-project');
  const result = checkManagedFiles(target);
  if (!result.ok) {
    for (const filePath of result.missing) console.error(`[missing] ${filePath}`);
    for (const item of result.changed) {
      console.error(`[changed] ${item.path} expected=${item.expected} actual=${item.actual}`);
    }
    for (const error of result.errors) console.error(`[error] ${error}`);
    fail(`manifest check failed: ${result.changed.length} changed, ${result.missing.length} missing`);
  }
  return `manifest check passed: ${target}`;
}
