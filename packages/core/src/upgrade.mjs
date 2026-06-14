import path from 'node:path';
import { VERSION } from './constants.mjs';
import { buildFactoryFilePlan } from './factory-plan.mjs';
import { abs, ensureDir, exists, readJson, sha, shaFile, writeJson, writeText } from './fs-utils.mjs';
import { DEFAULT_CONFLICT_POLICY } from './manifest.mjs';
import { readProjectId } from './state.mjs';

const REPORT_PATH = '.harness/upgrades/upgrade-report.json';
const SUMMARY_PATH = '.harness/upgrades/upgrade-summary.md';

function normalizeRelPath(rel) {
  return rel.split(path.sep).join('/');
}

function classify({ fileExists, baselineChecksum, currentChecksum, templateChecksum, mergeStrategy }) {
  if (!fileExists) return 'conflict';
  if (!templateChecksum) return 'ignored';

  const currentMatchesBaseline = currentChecksum === baselineChecksum;
  const templateMatchesBaseline = templateChecksum === baselineChecksum;

  if (currentMatchesBaseline && templateMatchesBaseline) return 'ignored';
  if (mergeStrategy === 'propose-only' && !templateMatchesBaseline) return 'propose-only';
  if (!currentMatchesBaseline && templateMatchesBaseline) return 'changed-by-user';
  if (currentMatchesBaseline && !templateMatchesBaseline) return 'safe-auto';
  return 'conflict';
}

function buildSummary(report) {
  const lines = [
    '# Upgrade Dry-run Summary',
    '',
    `Target: ${report.target}`,
    `Generator: ${report.generator.name}@${report.generator.version}`,
    `Manifest generator: ${report.manifest.generator.name}@${report.manifest.generator.version}`,
    '',
    '## Counts',
    ''
  ];
  for (const [classification, count] of Object.entries(report.counts)) {
    lines.push(`- ${classification}: ${count}`);
  }
  lines.push('', '## Files', '');
  for (const item of report.files) {
    lines.push(`- ${item.classification}: ${item.path}`);
  }
  return `${lines.join('\n')}\n`;
}

export function planFactoryUpgradeDryRun({ target }) {
  const manifestPath = path.join(target, '.harness/manifest.lock');
  if (!exists(manifestPath)) {
    throw new Error('manifest.lock not found');
  }
  const handoffPath = path.join(target, '.harness/planning/build-handoff.json');
  if (!exists(handoffPath)) {
    throw new Error('build-handoff.json not found');
  }

  const manifest = readJson(manifestPath);
  const handoff = readJson(handoffPath);
  const projectId = manifest.factoryId || readProjectId(target) || handoff.projectId;
  const templateFiles = new Map(
    buildFactoryFilePlan({ projectId, handoff, handoffPath })
      .map(file => [normalizeRelPath(file.path), file])
  );
  const managedFiles = manifest.managedFiles || manifest.files || [];
  const counts = {
    'safe-auto': 0,
    'changed-by-user': 0,
    conflict: 0,
    'propose-only': 0,
    ignored: 0
  };

  const files = managedFiles
    .filter(item => item?.path && item?.checksum)
    .map(item => {
      const rel = normalizeRelPath(item.path);
      const targetPath = path.join(target, rel);
      const template = templateFiles.get(rel);
      const fileExists = exists(targetPath);
      const currentChecksum = fileExists ? `sha256:${shaFile(targetPath)}` : null;
      const templateChecksum = template ? `sha256:${sha(template.content)}` : null;
      const mergeStrategy = item.mergeStrategy || 'replace-if-unchanged';
      const classification = classify({
        fileExists,
        baselineChecksum: item.checksum,
        currentChecksum,
        templateChecksum,
        mergeStrategy
      });
      counts[classification] += 1;
      return {
        path: rel,
        classification,
        ownership: item.ownership || 'unknown',
        mergeStrategy,
        conflictPolicy: item.conflictPolicy || manifest.defaults?.conflictPolicy || DEFAULT_CONFLICT_POLICY,
        checksums: {
          manifest: item.checksum,
          current: currentChecksum,
          template: templateChecksum
        },
        reason: reasonForClassification(classification, { fileExists, templateExists: Boolean(template) })
      };
    });

  return {
    schemaVersion: 1,
    mode: 'dry-run',
    target,
    generatedAt: new Date(0).toISOString(),
    reportPath: REPORT_PATH,
    summaryPath: SUMMARY_PATH,
    generator: {
      name: 'meta-harness-platform-starter',
      version: VERSION
    },
    manifest: {
      path: '.harness/manifest.lock',
      generator: {
        name: manifest.generator?.name || 'unknown',
        version: manifest.generator?.version || 'unknown'
      }
    },
    counts,
    files
  };
}

function reasonForClassification(classification, { fileExists, templateExists }) {
  if (!fileExists) return 'managed file is missing from target repo';
  if (!templateExists) return 'managed file is not produced by the current factory templates';
  if (classification === 'ignored') return 'target and current template match the manifest baseline';
  if (classification === 'changed-by-user') return 'target file differs from the manifest baseline, while template is unchanged';
  if (classification === 'safe-auto') return 'target file is unchanged and current template differs from baseline';
  if (classification === 'propose-only') return 'current template differs from baseline and merge strategy requires proposal';
  return 'target and current template both differ from the manifest baseline';
}

export function cmdFactoryUpgrade(opts, fail) {
  if (!opts['dry-run']) fail('factory upgrade currently supports --dry-run only');
  const target = abs(opts.target || '../target-project');
  let report;
  try {
    report = planFactoryUpgradeDryRun({ target });
  } catch (error) {
    fail(error.message);
  }
  const reportPath = path.join(target, REPORT_PATH);
  const summaryPath = path.join(target, SUMMARY_PATH);
  ensureDir(path.dirname(reportPath));
  writeJson(reportPath, report);
  writeText(summaryPath, buildSummary(report));
  return `factory upgrade dry-run wrote ${REPORT_PATH} and ${SUMMARY_PATH}`;
}
