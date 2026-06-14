import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateObject } from './contracts.mjs';
import { ensureDir, sha, writeJson } from './fs-utils.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SUITES_DIR = path.join(ROOT, 'evals/suites');
const DEFAULT_RESULTS_DIR = path.join(ROOT, 'evals/results');
const NETWORK_COMMAND_PATTERN = /\b(curl|wget|ssh|scp|kubectl|docker|gh)\b|\bgit\s+(push|pull|fetch|clone)\b|\bnpm\s+(install|publish)\b/i;

function readSuiteFile(filePath) {
  const suite = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const validation = validateObject('evalSuite', suite);
  if (!validation.ok) {
    throw new Error(`invalid eval suite ${filePath}: ${validation.errors.join('; ')}`);
  }
  return suite;
}

function suiteFiles() {
  if (!fs.existsSync(SUITES_DIR)) return [];
  return fs.readdirSync(SUITES_DIR)
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(name => path.join(SUITES_DIR, name));
}

function stableHash(value) {
  const withoutResultHash = { ...value };
  delete withoutResultHash.resultHash;
  return `sha256:${sha(JSON.stringify(withoutResultHash, null, 2) + '\n')}`;
}

function outputHash(value) {
  return `sha256:${sha(value || '')}`;
}

function findExpected(caseDef, commandId) {
  return caseDef.expectedOutputs.find(item => item.commandId === commandId) || { exitCode: 0 };
}

function expectedMatches(actual, expected) {
  const errors = [];
  if (actual.exitCode !== expected.exitCode) errors.push(`exitCode expected ${expected.exitCode}, got ${actual.exitCode}`);
  for (const text of expected.stdoutIncludes || []) {
    if (!actual.stdout.includes(text)) errors.push(`stdout missing ${JSON.stringify(text)}`);
  }
  for (const text of expected.stderrIncludes || []) {
    if (!actual.stderr.includes(text)) errors.push(`stderr missing ${JSON.stringify(text)}`);
  }
  return errors;
}

function runCommand(command, opts) {
  if (opts.noNetwork && NETWORK_COMMAND_PATTERN.test(command.run)) {
    return {
      commandId: command.id,
      exitCode: 126,
      stdout: '',
      stderr: 'command blocked by no-network eval policy'
    };
  }
  const result = spawnSync(command.run, {
    cwd: path.resolve(ROOT, command.cwd || '.'),
    encoding: 'utf8',
    shell: true,
    timeout: (command.timeoutSeconds || 60) * 1000,
    maxBuffer: 1024 * 1024
  });
  return {
    commandId: command.id,
    exitCode: result.status ?? 124,
    stdout: result.stdout || '',
    stderr: result.stderr || (result.error ? result.error.message : '')
  };
}

function commandResultForJson(actual, errors) {
  return {
    commandId: actual.commandId,
    status: errors.length ? 'failed' : 'passed',
    exitCode: actual.exitCode,
    stdoutHash: outputHash(actual.stdout),
    stderrHash: outputHash(actual.stderr),
    expectationErrors: errors
  };
}

export function listEvalSuites() {
  return suiteFiles().map(readSuiteFile).sort((a, b) => a.suiteId.localeCompare(b.suiteId));
}

export function findEvalSuite(suiteId) {
  return listEvalSuites().find(suite => suite.suiteId === suiteId);
}

export function runEvalSuite(suiteId, opts = {}) {
  const suite = findEvalSuite(suiteId);
  if (!suite) throw new Error(`unknown eval suite: ${suiteId}`);
  if (opts.noNetwork && suite.network !== 'none') {
    throw new Error(`eval suite ${suiteId} requires network mode: ${suite.network}`);
  }

  const cases = suite.cases.map(caseDef => {
    const commands = caseDef.commands.map(command => {
      const actual = runCommand(command, opts);
      const errors = expectedMatches(actual, findExpected(caseDef, command.id));
      return commandResultForJson(actual, errors);
    });
    return {
      caseId: caseDef.caseId,
      status: commands.every(command => command.status === 'passed') ? 'passed' : 'failed',
      commands
    };
  }).sort((a, b) => a.caseId.localeCompare(b.caseId));

  const passedCases = cases.filter(item => item.status === 'passed').length;
  const totalCases = cases.length;
  const score = totalCases === 0 ? 0 : Number((passedCases / totalCases).toFixed(6));
  const result = {
    schemaVersion: '1.0.0',
    suiteId: suite.suiteId,
    status: score >= suite.scoring.passThreshold ? 'passed' : 'failed',
    network: suite.network,
    resultHash: 'sha256:pending',
    summary: {
      totalCases,
      passedCases,
      failedCases: totalCases - passedCases,
      score
    },
    cases
  };
  result.resultHash = stableHash(result);
  const validation = validateObject('evalResult', result);
  if (!validation.ok) throw new Error(`invalid eval result: ${validation.errors.join('; ')}`);
  return result;
}

export function writeEvalResult(result, outputPath = null) {
  const target = outputPath
    ? path.resolve(process.cwd(), outputPath)
    : path.join(DEFAULT_RESULTS_DIR, `${result.suiteId}.result.json`);
  ensureDir(path.dirname(target));
  writeJson(target, result);
  return target;
}

export function cmdEvalList() {
  const suites = listEvalSuites();
  for (const suite of suites) {
    console.log(`${suite.suiteId}\t${suite.network}\t${suite.category}\t${suite.title}`);
  }
  return `listed ${suites.length} eval suite(s)`;
}

export function cmdEvalRun(opts, fail) {
  const suiteId = opts.suite;
  if (!suiteId) fail('eval run requires --suite <suite-id>');
  let result;
  try {
    result = runEvalSuite(suiteId, { noNetwork: opts['no-network'] === true || opts.noNetwork === true });
  } catch (error) {
    fail(error.message);
  }
  const output = writeEvalResult(result, opts.output || null);
  console.log(JSON.stringify({ suiteId: result.suiteId, status: result.status, resultHash: result.resultHash, output }, null, 2));
  if (result.status !== 'passed') process.exit(1);
}
