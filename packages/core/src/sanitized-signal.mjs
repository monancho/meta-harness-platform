import fs from 'node:fs';
import path from 'node:path';
import { VERSION } from './constants.mjs';
import { abs, exists, readJson, sha, writeJson } from './fs-utils.mjs';
import { assertContractFile } from './contracts.mjs';

const SAFE_CODE_RE = /^[A-Z0-9][A-Z0-9_:-]{0,79}$/;
const SAFE_TOKEN_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const SAFE_VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const KNOWN_FAILURE_CATEGORIES = new Set(['security', 'schema', 'verification', 'adapter', 'execution']);

function countBucket(count) {
  const n = Number.isFinite(count) && count >= 0 ? count : 0;
  if (n === 0) return '0';
  if (n === 1) return '1';
  if (n <= 5) return '2-5';
  if (n <= 20) return '6-20';
  return '21-plus';
}

function lineBucket(count) {
  const n = Number.isFinite(count) && count >= 0 ? count : 0;
  if (n === 0) return '0';
  if (n <= 50) return '1-50';
  if (n <= 250) return '51-250';
  if (n <= 1000) return '251-1000';
  return '1001-plus';
}

function safeToken(value, fallback = 'unknown') {
  const normalized = String(value || '').trim();
  return SAFE_TOKEN_RE.test(normalized) ? normalized : fallback;
}

function safeReasonCode(value) {
  const normalized = String(value || '').trim();
  return SAFE_CODE_RE.test(normalized) ? normalized : 'MH_REASON_UNCLASSIFIED';
}

function safeVersion(value) {
  const normalized = String(value || '').trim();
  return SAFE_VERSION_RE.test(normalized) ? normalized : VERSION;
}

function safeFailureCategory(value, status) {
  const normalized = String(value || '').trim();
  if (KNOWN_FAILURE_CATEGORIES.has(normalized)) return normalized;
  return status === 'failed' ? 'execution' : undefined;
}

function sourceRunResultPath({ target, run }) {
  const targetRoot = abs(target || '.');
  if (run) {
    const direct = path.resolve(targetRoot, run);
    if (exists(direct) && fs.statSync(direct).isFile()) return direct;
    const byId = path.join(targetRoot, '.harness/runs', run, 'run-result.json');
    if (exists(byId)) return byId;
    throw new Error(`run-result.json not found for run: ${run}`);
  }

  const runsDir = path.join(targetRoot, '.harness/runs');
  if (!exists(runsDir)) throw new Error('no .harness/runs directory found');
  const latest = fs.readdirSync(runsDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(runsDir, entry.name, 'run-result.json'))
    .filter(file => exists(file))
    .sort()
    .at(-1);
  if (!latest) throw new Error('no run-result.json files found');
  return latest;
}

export function buildSanitizedSignal(runResult, options = {}) {
  const status = runResult.status === 'failed' ? 'failed' : 'passed';
  const verify = Array.isArray(runResult.verify) ? runResult.verify : [];
  const failedVerify = verify.filter(item => item?.status === 'failed').length;
  const reasonCodes = [...new Set([
    runResult.reasonCode,
    failedVerify > 0 ? 'MH_VERIFY_FAILED' : null
  ].filter(Boolean).map(safeReasonCode))];
  const patchLineCount = Number.isFinite(options.patchLineCount) ? options.patchLineCount : 0;
  const failureCategory = safeFailureCategory(runResult.failureCategory, status);

  return {
    schemaVersion: '1.0.0',
    signalId: `signal-${sha(`${runResult.runId || 'unknown'}:${runResult.startedAt || ''}`).slice(0, 16)}`,
    sourceRunId: String(runResult.runId || 'unknown'),
    generatorVersion: safeVersion(runResult.generatorVersion || options.generatorVersion || VERSION),
    executionProfile: safeReasonCode(runResult.execution?.profile || options.executionProfile || 'L0_LOCAL_WORKTREE'),
    taskType: safeToken(runResult.taskType || options.taskType || 'unknown'),
    result: status,
    failureCategory,
    reasonCodes,
    metricBuckets: {
      changedFiles: countBucket(Array.isArray(runResult.changedFiles) ? runResult.changedFiles.length : 0),
      verifyChecks: countBucket(verify.length),
      failedVerifyChecks: countBucket(failedVerify),
      patchLines: lineBucket(patchLineCount),
      artifactCount: countBucket(Array.isArray(runResult.artifacts) ? runResult.artifacts.length : 0)
    },
    improvementSignals: reasonCodes.length ? reasonCodes.map(code => `reason:${code}`) : [],
    privacyFlags: {
      excludesRawPatchContent: true,
      excludesRawLogs: true,
      excludesRawDocs: true,
      excludesSecrets: true,
      excludesCustomerText: true,
      containsOnlySanitizedMetrics: true,
      targetOwnsRawArtifacts: true
    },
    createdAt: options.createdAt || new Date().toISOString()
  };
}

export function exportSanitizedSignal({ runResultPath, outputPath, generatorVersion } = {}) {
  if (!runResultPath) throw new Error('runResultPath is required');
  const runResult = readJson(runResultPath);
  const runDir = path.dirname(runResultPath);
  const patchPath = path.join(runDir, 'patch.diff');
  const patchLineCount = exists(patchPath) ? fs.readFileSync(patchPath, 'utf8').split(/\r?\n/).length - 1 : 0;
  const signal = buildSanitizedSignal(runResult, { patchLineCount, generatorVersion });
  const out = outputPath || path.join(runDir, 'sanitized-signal.json');
  writeJson(out, signal);
  return { signal, outputPath: out };
}

export function cmdSignalExport(opts, fail) {
  let result;
  try {
    const runResultPath = sourceRunResultPath({ target: opts.target || '.', run: opts.run });
    const outputPath = opts.output ? path.resolve(abs(opts.target || '.'), opts.output) : undefined;
    result = exportSanitizedSignal({ runResultPath, outputPath });
    assertContractFile('sanitizedSignal', result.outputPath, fail);
  } catch (error) {
    fail(error.message);
  }
  console.log(`[ok] sanitized signal exported: ${result.outputPath}`);
}
