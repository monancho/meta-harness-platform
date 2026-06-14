import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { abs, ensureDir, exists, readJson, readText, writeText } from './fs-utils.mjs';

function shellOut(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function commandExists(binary) {
  const candidate = String(binary || '').trim();
  if (!candidate) return false;
  if (candidate.includes('/') || candidate.includes('\\')) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }
  try {
    execFileSync('sh', ['-c', `command -v ${JSON.stringify(candidate)}`], { stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch {
    return false;
  }
}

function safeBranchPart(value) {
  return String(value || 'run')
    .toLowerCase()
    .replace(/[^a-z0-9._/-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'run';
}

function resolveRunDir(target, run) {
  if (!run) {
    const runsDir = path.join(target, '.harness/runs');
    if (!exists(runsDir)) throw new Error('run is required because .harness/runs does not exist');
    const candidates = fs.readdirSync(runsDir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(runsDir, entry.name))
      .filter(dir => exists(path.join(dir, 'run-result.json')))
      .sort();
    const latest = candidates.at(-1);
    if (!latest) throw new Error('run is required because no run-result.json files were found');
    return latest;
  }

  const raw = String(run);
  const direct = path.resolve(target, raw);
  if (exists(direct) && fs.statSync(direct).isFile() && path.basename(direct) === 'run-result.json') return path.dirname(direct);
  if (exists(direct) && fs.statSync(direct).isDirectory()) return direct;

  const byId = path.join(target, '.harness/runs', raw);
  if (exists(byId) && fs.statSync(byId).isDirectory()) return byId;

  throw new Error(`run not found: ${run}`);
}

function buildPrBody({ result, summary, patch, branch, base }) {
  const changedFiles = result.changedFiles?.length ? result.changedFiles.map(file => `- ${file}`).join('\n') : '- none recorded';
  const verify = result.verify?.length
    ? result.verify.map(item => `- ${item.command}: ${item.status}`).join('\n')
    : '- not recorded';
  const patchLineCount = patch.trim() ? patch.split(/\r?\n/).length : 0;
  return `# Harness Run PR

## Run

- Run ID: ${result.runId}
- Task: ${result.taskId}
- Adapter: ${result.adapter}
- Status: ${result.status}
- Branch: ${branch}
- Base: ${base}

## Changed Files

${changedFiles}

## Verification

${verify}

## Artifacts

- \`.harness/runs/${result.runId}/run-result.json\`
- \`.harness/runs/${result.runId}/summary.md\`
- \`.harness/runs/${result.runId}/patch.diff\` (${patchLineCount} lines)

## Summary

${summary.trim() || '_No summary.md content recorded._'}
`;
}

function assertGitRepo(target, fail) {
  try {
    shellOut('git', ['rev-parse', '--is-inside-work-tree'], target);
  } catch {
    fail('github pr requires a git repository target. Initialize git and commit a base revision first.');
  }
}

function assertCleanWorktree(target, fail) {
  const status = shellOut('git', ['status', '--porcelain'], target);
  if (status) fail('github pr requires a clean target worktree before applying run patch.');
}

function createBranchCommitPr({ target, runDir, result, branch, base, title, prBodyPath, ghBinary, fail }) {
  if (!commandExists(ghBinary)) {
    fail(`gh CLI not found. Install GitHub CLI, authenticate with "gh auth login", or rerun without --create to generate only ${path.relative(target, prBodyPath)}.`);
  }

  assertGitRepo(target, fail);
  assertCleanWorktree(target, fail);

  const patchPath = path.join(runDir, 'patch.diff');
  const patch = readText(patchPath, '');
  if (!patch.trim()) fail(`cannot create PR because ${path.relative(target, patchPath)} is empty`);

  shellOut('git', ['checkout', '-B', branch], target);
  try {
    shellOut('git', ['apply', '--index', patchPath], target);
    shellOut('git', ['commit', '-m', title], target);
  } catch (error) {
    fail(`failed to apply run patch and create commit: ${error.stderr || error.message}`);
  }

  try {
    const url = shellOut(ghBinary, ['pr', 'create', '--base', base, '--head', branch, '--title', title, '--body-file', prBodyPath], target);
    return url || '(gh did not print a PR URL)';
  } catch (error) {
    fail(`gh pr create failed. Ensure the branch is pushed/visible to GitHub and gh is authenticated. Detail: ${error.stderr || error.message}`);
  }
}

export function cmdGithubPr(opts, fail) {
  const target = abs(opts.target || '.');
  let runDir;
  try {
    runDir = resolveRunDir(target, opts.run);
  } catch (error) {
    fail(error.message);
  }

  const resultPath = path.join(runDir, 'run-result.json');
  const summaryPath = path.join(runDir, 'summary.md');
  const patchPath = path.join(runDir, 'patch.diff');
  if (!exists(resultPath)) fail(`run-result.json not found for run: ${path.relative(target, runDir)}`);

  const result = readJson(resultPath);
  const base = opts.base || 'main';
  const branch = opts.branch || `mh/${safeBranchPart(result.taskId)}/${safeBranchPart(result.runId)}`;
  const title = opts.title || `Harness run ${result.taskId || result.runId}`;
  const bodyPath = path.join(runDir, 'pr-body.md');
  const body = buildPrBody({
    result,
    summary: readText(summaryPath, ''),
    patch: readText(patchPath, ''),
    branch,
    base
  });

  writeText(bodyPath, body);
  console.log(body);
  console.log(`\n[ok] PR body written: ${path.relative(target, bodyPath)}`);

  if (!opts.create) {
    console.log('[ok] dry run only. Re-run with --create to create branch, commit, and PR using gh.');
    return;
  }

  ensureDir(path.dirname(bodyPath));
  const prUrl = createBranchCommitPr({
    target,
    runDir,
    result,
    branch,
    base,
    title,
    prBodyPath: bodyPath,
    ghBinary: process.env.MH_GH_BINARY || opts.gh || 'gh',
    fail
  });
  console.log(`[ok] PR created: ${prUrl}`);
}
