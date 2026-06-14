const DEFAULT_FIXTURE_BASE = './fixtures';

const FIXTURE_FILES = {
  runResult: 'run-result.json',
  manifest: 'manifest.lock',
  state: 'state.yml',
  taskPacket: 'task-packet.json'
};

export async function loadDashboardFixtures(options = {}) {
  const basePath = normalizeBasePath(options.basePath ?? DEFAULT_FIXTURE_BASE);
  const readText = options.readText ?? readTextWithFetch;

  const [runResultText, manifestText, stateText, taskPacketText] = await Promise.all([
    readFixture(readText, basePath, FIXTURE_FILES.runResult),
    readFixture(readText, basePath, FIXTURE_FILES.manifest),
    readFixture(readText, basePath, FIXTURE_FILES.state),
    readFixture(readText, basePath, FIXTURE_FILES.taskPacket)
  ]);

  return {
    source: basePath,
    runResult: parseJsonFixture(FIXTURE_FILES.runResult, runResultText),
    manifest: parseJsonFixture(FIXTURE_FILES.manifest, manifestText),
    state: parseSimpleYaml(stateText),
    taskPacket: parseJsonFixture(FIXTURE_FILES.taskPacket, taskPacketText)
  };
}

export function summarizeDashboardFixtures(fixtures) {
  const managedFiles = fixtures.manifest?.managedFiles ?? [];
  const artifacts = fixtures.runResult?.artifacts ?? [];
  const forbiddenScope = fixtures.taskPacket?.forbiddenScope ?? [];
  const editableScope = fixtures.taskPacket?.editableScope ?? [];

  return {
    projectId: fixtures.state?.projectId ?? 'unknown',
    phase: fixtures.state?.phase ?? 'unknown',
    lastRunStatus: fixtures.runResult?.status ?? 'unknown',
    lastRunId: fixtures.runResult?.runId ?? 'unknown',
    taskId: fixtures.taskPacket?.taskId ?? 'unknown',
    managedFileCount: managedFiles.length,
    artifactCount: artifacts.length,
    policyCount: forbiddenScope.length + editableScope.length
  };
}

function normalizeBasePath(basePath) {
  return String(basePath || DEFAULT_FIXTURE_BASE).replace(/\/+$/, '');
}

async function readFixture(readText, basePath, fileName) {
  return readText(`${basePath}/${fileName}`);
}

async function readTextWithFetch(path) {
  if (typeof fetch !== 'function') {
    throw new Error('No fixture reader is available. Pass { readText } when running outside a browser.');
  }
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load fixture ${path}: ${response.status}`);
  return response.text();
}

function parseJsonFixture(fileName, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON fixture ${fileName}: ${error.message}`);
  }
}

export function parseSimpleYaml(text) {
  const root = {};
  const stack = [{ indent: -1, value: root }];

  for (const rawLine of text.split(/\r?\n/)) {
    const lineWithoutComment = rawLine.replace(/\s+#.*$/, '');
    if (!lineWithoutComment.trim()) continue;

    const indent = lineWithoutComment.match(/^\s*/)[0].length;
    const trimmed = lineWithoutComment.trim();
    const match = trimmed.match(/^([^:]+):(.*)$/);
    if (!match) continue;

    const key = match[1].trim();
    const rawValue = match[2].trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();

    const parent = stack[stack.length - 1].value;
    if (!rawValue) {
      parent[key] = {};
      stack.push({ indent, value: parent[key] });
    } else {
      parent[key] = parseScalar(rawValue);
    }
  }

  return root;
}

function parseScalar(value) {
  const unquoted = value.replace(/^['"]|['"]$/g, '');
  if (unquoted === 'true') return true;
  if (unquoted === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(unquoted)) return Number(unquoted);
  return unquoted;
}
