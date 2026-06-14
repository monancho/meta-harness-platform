import fs from 'node:fs';
import path from 'node:path';
import { VERSION } from './constants.mjs';
import { ensureDir, readJson, writeJson, writeText } from './fs-utils.mjs';
import { validateObject } from './contracts.mjs';

const GROUP_FIELDS = ['failureCategory', 'reasonCode', 'profile', 'adapter', 'generatorVersion'];
const REQUIRED_PRIVACY_FLAGS = [
  'excludesRawPatchContent',
  'excludesRawLogs',
  'excludesRawDocs',
  'excludesSecrets',
  'excludesCustomerText',
  'containsOnlySanitizedMetrics',
  'targetOwnsRawArtifacts'
];

function sortText(a, b) {
  return String(a).localeCompare(String(b));
}

function safeSegment(value) {
  return String(value || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || 'unknown';
}

function sortedUnique(values) {
  return [...new Set(values.filter(Boolean).map(String))].sort(sortText);
}

function countBy(values) {
  const counts = {};
  for (const value of values.filter(Boolean).map(String).sort(sortText)) {
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function mergeCounts(target, source = {}) {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] || 0) + Number(value || 0);
  }
}

function findSanitizedSignalFiles(inputDir) {
  const found = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => sortText(a.name, b.name));
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.isFile() && entry.name === 'sanitized-signal.json') found.push(fullPath);
    }
  }
  walk(path.resolve(inputDir));
  return found;
}

function validateSanitizedOnly(signal, filePath) {
  const validation = validateObject('sanitizedSignal', signal);
  if (!validation.ok) {
    throw new Error(`invalid sanitized signal ${filePath}: ${validation.errors.join('; ')}`);
  }
  for (const flag of REQUIRED_PRIVACY_FLAGS) {
    if (signal.privacyFlags?.[flag] !== true) {
      throw new Error(`sanitized signal ${filePath} is missing privacy flag: ${flag}`);
    }
  }
}

function proposalArea(failureCategory, reasonCode) {
  if (failureCategory === 'security') return 'policies';
  if (failureCategory === 'schema') return 'gates';
  if (failureCategory === 'verification') return 'gates';
  if (failureCategory === 'adapter') return 'prompts';
  if (String(reasonCode).includes('TEMPLATE')) return 'templates';
  return 'templates';
}

function proposalTitle(group) {
  return `${group.failureCategory}/${group.reasonCode} on ${group.profile} via ${group.adapter}`;
}

function proposalBody(group) {
  const area = proposalArea(group.failureCategory, group.reasonCode);
  return [
    `# ${proposalTitle(group)}`,
    '',
    'Status: candidate-only',
    'Validation required: eval regression must pass before this proposal can change templates, prompts, policies, or gates.',
    '',
    '## Sanitized Pattern',
    '',
    `- Failure category: ${group.failureCategory}`,
    `- Reason code: ${group.reasonCode}`,
    `- Execution profile: ${group.profile}`,
    `- Adapter: ${group.adapter}`,
    `- Generator version: ${group.generatorVersion}`,
    `- Occurrences: ${group.count}`,
    `- Affected task types: ${group.taskTypes.join(', ') || 'unknown'}`,
    '',
    '## Candidate Improvement',
    '',
    `Consider a generalized ${area} improvement for this repeated sanitized pattern.`,
    'Keep the change independent of any target project content and validate it against the eval registry before adoption.',
    '',
    '## Privacy Boundary',
    '',
    'This proposal was generated only from sanitized signal fields: failure category, reason code, execution profile, adapter, generator version, task type, metric buckets, and improvement signal labels.',
    'It intentionally excludes raw PRD, code, logs, patch content, secrets, and customer text.',
    ''
  ].join('\n');
}

function taxonomyMarkdown(summary) {
  const lines = [
    '# Failure Taxonomy Summary',
    '',
    `Analyzer version: ${summary.analyzerVersion}`,
    `Signals read: ${summary.input.signalCount}`,
    `Failed signals: ${summary.input.failedSignalCount}`,
    '',
    'Privacy boundary: raw project documents, code, logs, patches, secrets, and customer text are not used or stored.',
    '',
    '## Groups',
    ''
  ];
  for (const group of summary.groups) {
    lines.push(`- ${group.groupId}: ${group.count} occurrence(s), proposal ${group.proposalPath}`);
  }
  if (!summary.groups.length) lines.push('- No failed sanitized patterns found.');
  lines.push('');
  return lines.join('\n');
}

export function analyzeFeedbackSignals({ inputDir, outputDir, analyzerVersion = VERSION } = {}) {
  if (!inputDir) throw new Error('inputDir is required');
  if (!outputDir) throw new Error('outputDir is required');
  const inputRoot = path.resolve(inputDir);
  if (!fs.existsSync(inputRoot) || !fs.statSync(inputRoot).isDirectory()) {
    throw new Error(`input directory not found: ${inputDir}`);
  }

  const signals = [];
  const groups = new Map();
  for (const file of findSanitizedSignalFiles(inputRoot)) {
    const signal = readJson(file);
    validateSanitizedOnly(signal, file);
    signals.push(signal);
    if (signal.result !== 'failed') continue;

    const reasonCodes = signal.reasonCodes?.length ? signal.reasonCodes : ['MH_REASON_UNCLASSIFIED'];
    for (const reasonCode of reasonCodes) {
      const keyParts = {
        failureCategory: signal.failureCategory || 'execution',
        reasonCode,
        profile: signal.executionProfile || 'L0_LOCAL_WORKTREE',
        adapter: signal.adapter || 'unknown',
        generatorVersion: signal.generatorVersion || 'unknown'
      };
      const key = GROUP_FIELDS.map(field => keyParts[field]).join('|');
      if (!groups.has(key)) {
        groups.set(key, {
          ...keyParts,
          count: 0,
          signalIds: [],
          taskTypes: [],
          improvementSignals: [],
          metricBuckets: {
            changedFiles: {},
            verifyChecks: {},
            failedVerifyChecks: {},
            patchLines: {},
            artifactCount: {}
          }
        });
      }
      const group = groups.get(key);
      group.count += 1;
      group.signalIds.push(signal.signalId);
      group.taskTypes.push(signal.taskType);
      group.improvementSignals.push(...(signal.improvementSignals || []));
      for (const metric of Object.keys(group.metricBuckets)) {
        mergeCounts(group.metricBuckets[metric], countBy([signal.metricBuckets?.[metric]]));
      }
    }
  }

  const outputRoot = path.resolve(outputDir);
  ensureDir(path.join(outputRoot, 'improvement-proposals'));
  const finalizedGroups = [...groups.values()]
    .map(group => {
      const groupId = [
        group.failureCategory,
        group.reasonCode,
        group.profile,
        group.adapter,
        group.generatorVersion
      ].map(safeSegment).join('__');
      return {
        groupId,
        count: group.count,
        failureCategory: group.failureCategory,
        reasonCode: group.reasonCode,
        profile: group.profile,
        adapter: group.adapter,
        generatorVersion: group.generatorVersion,
        taskTypes: sortedUnique(group.taskTypes),
        signalIds: sortedUnique(group.signalIds),
        improvementSignals: sortedUnique(group.improvementSignals),
        metricBuckets: group.metricBuckets,
        proposalStatus: 'candidate-only',
        requiresValidation: 'eval-regression',
        proposalPath: `improvement-proposals/${groupId}.md`
      };
    })
    .sort((a, b) => b.count - a.count || sortText(a.groupId, b.groupId));

  const summary = {
    schemaVersion: '1.0.0',
    analyzerVersion,
    groupBy: GROUP_FIELDS,
    input: {
      directory: inputRoot,
      signalCount: signals.length,
      failedSignalCount: signals.filter(signal => signal.result === 'failed').length
    },
    privacyBoundary: {
      usesOnlySanitizedSignals: true,
      excludesRawProjectContent: true,
      targetOwnsRawArtifacts: true
    },
    groups: finalizedGroups
  };

  writeJson(path.join(outputRoot, 'failure-taxonomy.json'), summary);
  writeText(path.join(outputRoot, 'failure-taxonomy.md'), taxonomyMarkdown(summary));
  for (const group of finalizedGroups) {
    writeText(path.join(outputRoot, group.proposalPath), proposalBody(group));
  }
  return summary;
}

export function cmdFeedbackAnalyze(opts, fail) {
  let summary;
  try {
    summary = analyzeFeedbackSignals({
      inputDir: opts.input || opts.signals,
      outputDir: opts.output || 'feedback-analysis'
    });
  } catch (error) {
    fail(error.message);
  }
  console.log(`[ok] feedback analysis complete: ${summary.groups.length} group(s), ${summary.input.signalCount} signal(s)`);
}
