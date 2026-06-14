const WELL_KNOWN_ARTIFACTS = new Map([
  ['patch.diff', 'patch'],
  ['summary.md', 'summary'],
  ['run-result.json', 'result'],
  ['test-report.json', 'test-report']
]);

export function parseRunResultJson(text, options = {}) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid run-result.json for ${options.runId ?? 'unknown run'}: ${error.message}`);
  }
  return normalizeRunResult(raw, options);
}

export function normalizeRunResult(raw, options = {}) {
  const runId = stringOr(raw.runId, options.runId ?? 'unknown-run');
  const startedAt = stringOr(raw.startedAt ?? raw.timestamp, null);
  const completedAt = stringOr(raw.completedAt, null);
  const durationMs = numberOr(raw.durationMs ?? raw.execution?.durationMs, durationBetween(startedAt, completedAt));
  const artifacts = normalizeArtifacts(raw.artifacts, { runId });

  return {
    runId,
    taskId: stringOr(raw.taskId, 'unknown'),
    status: stringOr(raw.status, 'unknown'),
    adapter: stringOr(raw.adapter, 'unknown'),
    durationMs,
    timestamp: completedAt ?? startedAt ?? stringOr(raw.createdAt, 'unknown'),
    startedAt,
    completedAt,
    reasonCode: raw.reasonCode ?? null,
    message: raw.message ?? '',
    executionMode: stringOr(raw.execution?.mode, 'unknown'),
    artifacts
  };
}

export async function discoverRunHistory(options = {}) {
  const runsDir = options.runsDir;
  if (!runsDir) throw new Error('runsDir is required');
  const readText = options.readText;
  const readdir = options.readdir;
  const joinPath = options.joinPath ?? joinPosix;
  if (typeof readText !== 'function' || typeof readdir !== 'function') {
    throw new Error('discoverRunHistory requires readText and readdir functions');
  }

  let entries;
  try {
    entries = await readdir(runsDir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') return { state: 'empty', runs: [], errors: [] };
    throw new Error(`Failed to read run directory ${runsDir}: ${error.message}`);
  }

  const runDirs = entries
    .filter(entry => isDirectoryEntry(entry))
    .map(entry => entry.name)
    .sort();

  if (runDirs.length === 0) return { state: 'empty', runs: [], errors: [] };

  const runs = [];
  const errors = [];
  for (const runId of runDirs) {
    const filePath = joinPath(runsDir, runId, 'run-result.json');
    try {
      const text = await readText(filePath);
      runs.push(parseRunResultJson(text, { runId }));
    } catch (error) {
      errors.push({ runId, filePath, message: error.message });
    }
  }

  runs.sort((a, b) => compareTimestamps(b.timestamp, a.timestamp) || a.runId.localeCompare(b.runId));
  return {
    state: errors.length > 0 ? 'error' : 'ready',
    runs,
    errors
  };
}

export function summarizeRunHistory(history) {
  const runs = history?.runs ?? [];
  return {
    runCount: runs.length,
    failedCount: runs.filter(run => run.status === 'failed').length,
    passedCount: runs.filter(run => run.status === 'passed').length,
    artifactCount: runs.reduce((count, run) => count + run.artifacts.length, 0),
    latestRunStatus: runs[0]?.status ?? 'none'
  };
}

function normalizeArtifacts(value, context) {
  const items = Array.isArray(value) ? value : [];
  return items.map(item => normalizeArtifact(item, context)).filter(Boolean);
}

function normalizeArtifact(item, context) {
  if (typeof item === 'string') {
    const fileName = basename(item);
    return artifactRecord({
      path: artifactPath(item, context.runId),
      fileName,
      kind: inferArtifactKind(fileName)
    });
  }
  if (!item || typeof item !== 'object') return null;
  const path = stringOr(item.path ?? item.href ?? item.file, '');
  const fileName = stringOr(item.fileName, basename(path));
  return artifactRecord({
    path,
    fileName,
    kind: stringOr(item.kind, inferArtifactKind(fileName || path))
  });
}

function artifactRecord(item) {
  return {
    path: item.path,
    fileName: item.fileName || basename(item.path),
    kind: item.kind,
    href: item.path
  };
}

function artifactPath(path, runId) {
  if (path.includes('/')) return path;
  return `.harness/runs/${runId}/${path}`;
}

function inferArtifactKind(path) {
  const fileName = basename(path);
  if (WELL_KNOWN_ARTIFACTS.has(fileName)) return WELL_KNOWN_ARTIFACTS.get(fileName);
  if (/\.(png|jpg|jpeg|webp|gif)$/i.test(fileName)) return 'screenshot';
  return 'artifact';
}

function durationBetween(startedAt, completedAt) {
  if (!startedAt || !completedAt) return null;
  const started = Date.parse(startedAt);
  const completed = Date.parse(completedAt);
  if (!Number.isFinite(started) || !Number.isFinite(completed)) return null;
  return Math.max(0, completed - started);
}

function compareTimestamps(a, b) {
  const left = Date.parse(a);
  const right = Date.parse(b);
  if (Number.isFinite(left) && Number.isFinite(right)) return left - right;
  return String(a).localeCompare(String(b));
}

function isDirectoryEntry(entry) {
  if (typeof entry === 'string') return true;
  return typeof entry?.isDirectory === 'function' ? entry.isDirectory() : Boolean(entry?.name);
}

function joinPosix(...parts) {
  return parts.join('/').replace(/\/+/g, '/');
}

function stringOr(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function numberOr(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function basename(value) {
  return String(value ?? '').split('/').filter(Boolean).at(-1) ?? '';
}
