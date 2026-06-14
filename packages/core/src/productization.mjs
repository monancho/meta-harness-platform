import fs from 'node:fs';
import path from 'node:path';
import { abs, ensureDir, exists, readJson, readText, writeText } from './fs-utils.mjs';

export const PRODUCTIZATION_CATEGORIES = [
  ['ux', 'UX'],
  ['a11y', 'Accessibility'],
  ['responsive', 'Responsive'],
  ['performance', 'Performance'],
  ['security', 'Security'],
  ['content', 'Content'],
  ['release-readiness', 'Release Readiness']
];

const DEFAULT_CHECKS = [
  ['ux-critical-flow', 'ux', 'Primary user flow is discoverable and can be completed without dead ends.', 'high'],
  ['a11y-keyboard-screenreader', 'a11y', 'Keyboard navigation, focus order, labels, and screen reader semantics are reviewed.', 'high'],
  ['responsive-core-viewports', 'responsive', 'Core screens are checked on mobile, tablet, and desktop viewports.', 'medium'],
  ['performance-preview-budget', 'performance', 'Preview build has a documented load/performance budget and obvious regressions are captured.', 'medium'],
  ['security-production-boundary', 'security', 'Secrets, production deploy paths, and auth-sensitive flows are reviewed before release.', 'high'],
  ['content-empty-error-states', 'content', 'Empty states, error states, labels, and user-facing copy are reviewed for release quality.', 'medium'],
  ['release-readiness-artifacts', 'release-readiness', 'Release notes, rollback notes, owner sign-off, and known risks are captured.', 'high']
];

export function defaultAuditChecklistContent() {
  const categories = PRODUCTIZATION_CATEGORIES
    .map(([id, title]) => `  - id: ${id}\n    title: ${title}`)
    .join('\n');
  const checks = DEFAULT_CHECKS
    .map(([id, category, title, severity]) => `  - id: ${id}
    category: ${category}
    title: ${title}
    severity: ${severity}
    status: todo
    evidence: []
    backlogTitle: Harden ${title}
    backlogAction: Review the finding, add scoped implementation tasks, and rerun the productization audit.`)
    .join('\n');
  return `schemaVersion: 1
policy:
  autoFixDefault: false
  output: .harness/productization/productization-report.md
categories:
${categories}
checks:
${checks}
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
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function parseFlatListSection(lines, startIndex) {
  const items = [];
  let current = null;
  let i = startIndex;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (/^[a-zA-Z0-9_-]+:/.test(line)) break;
    const itemMatch = line.match(/^  - ([^:]+):\s*(.*)$/);
    if (itemMatch) {
      current = { [itemMatch[1]]: parseScalar(itemMatch[2]) };
      items.push(current);
      continue;
    }
    const fieldMatch = line.match(/^    ([^:]+):\s*(.*)$/);
    if (fieldMatch && current) current[fieldMatch[1]] = parseScalar(fieldMatch[2]);
  }
  return { items, nextIndex: i - 1 };
}

export function parseAuditChecklist(content) {
  const lines = content.split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#'));
  const checklist = { schemaVersion: 1, policy: {}, categories: [], checks: [] };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('schemaVersion:')) checklist.schemaVersion = parseScalar(line.split(':').slice(1).join(':'));
    else if (line === 'policy:') {
      for (i += 1; i < lines.length; i++) {
        const policyMatch = lines[i].match(/^  ([^:]+):\s*(.*)$/);
        if (!policyMatch) { i -= 1; break; }
        checklist.policy[policyMatch[1]] = parseScalar(policyMatch[2]);
      }
    } else if (line === 'categories:') {
      const parsed = parseFlatListSection(lines, i + 1);
      checklist.categories = parsed.items;
      i = parsed.nextIndex;
    } else if (line === 'checks:') {
      const parsed = parseFlatListSection(lines, i + 1);
      checklist.checks = parsed.items;
      i = parsed.nextIndex;
    }
  }
  return checklist;
}

function latestRunResultPath(target) {
  const runsDir = path.join(target, '.harness/runs');
  if (!exists(runsDir)) return null;
  const candidates = fs.readdirSync(runsDir)
    .map(name => path.join(runsDir, name, 'run-result.json'))
    .filter(file => exists(file))
    .sort();
  return candidates.at(-1) || null;
}

function readRunResult(target, run) {
  if (!run) {
    const latest = latestRunResultPath(target);
    return latest ? { path: latest, result: readJson(latest) } : null;
  }
  const candidate = run.endsWith('.json') ? path.resolve(target, run) : path.join(target, '.harness/runs', run, 'run-result.json');
  return exists(candidate) ? { path: candidate, result: readJson(candidate) } : null;
}

function statusCounts(checks) {
  const counts = {};
  for (const check of checks) counts[check.status || 'unknown'] = (counts[check.status || 'unknown'] || 0) + 1;
  return counts;
}

function backlogItems(checks, runInfo) {
  return checks
    .filter(check => !['pass', 'passed', 'done'].includes(String(check.status || '').toLowerCase()))
    .map((check, index) => ({
      id: `HARDEN-${String(index + 1).padStart(3, '0')}`,
      category: check.category || 'uncategorized',
      sourceCheck: check.id,
      severity: check.severity || 'medium',
      title: check.backlogTitle || `Harden ${check.title || check.id}`,
      action: check.backlogAction || 'Create a scoped follow-up task and rerun the productization audit.',
      runEvidence: runInfo?.result?.runId || null
    }));
}

function tableRow(values) {
  return `| ${values.map(value => String(value ?? '').replace(/\|/g, '\\|')).join(' |')} |`;
}

export function buildProductizationReport({ checklist, runInfo = null }) {
  const categories = new Map(checklist.categories.map(category => [category.id, category]));
  const counts = statusCounts(checklist.checks);
  const backlog = backlogItems(checklist.checks, runInfo);
  const lines = [
    '# Productization Audit Report',
    '',
    'This report is generated from `.harness/productization/audit-checklist.yml` and local run artifacts.',
    'It does not auto-fix findings. Non-passing checks are converted into hardening backlog items.',
    '',
    '## Summary',
    '',
    `- Auto-fix default: ${checklist.policy?.autoFixDefault === false ? 'false' : String(checklist.policy?.autoFixDefault ?? 'unspecified')}`,
    `- Run artifact: ${runInfo?.path ? path.relative(process.cwd(), runInfo.path) : 'not found'}`,
    `- Run status: ${runInfo?.result?.status || 'unknown'}`,
    `- Hardening backlog items: ${backlog.length}`,
    `- Status counts: ${Object.entries(counts).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}`,
    '',
    '## Checklist',
    '',
    tableRow(['Category', 'Check', 'Severity', 'Status', 'Evidence']),
    tableRow(['---', '---', '---', '---', '---'])
  ];

  for (const check of checklist.checks) {
    const category = categories.get(check.category)?.title || check.category || 'Uncategorized';
    const evidence = Array.isArray(check.evidence) ? check.evidence.join(', ') : check.evidence || '';
    lines.push(tableRow([category, check.title || check.id, check.severity || 'medium', check.status || 'unknown', evidence]));
  }

  lines.push('', '## Hardening Backlog', '');
  if (backlog.length === 0) {
    lines.push('No hardening backlog items were generated.');
  } else {
    for (const item of backlog) {
      lines.push(`### ${item.id}: ${item.title}`);
      lines.push('');
      lines.push(`- Category: ${item.category}`);
      lines.push(`- Source check: ${item.sourceCheck}`);
      lines.push(`- Severity: ${item.severity}`);
      lines.push(`- Action: ${item.action}`);
      if (item.runEvidence) lines.push(`- Run evidence: ${item.runEvidence}`);
      lines.push('');
    }
  }

  return { markdown: `${lines.join('\n').trimEnd()}\n`, backlog };
}

export function cmdProductizationInit(opts, fail) {
  const target = abs(opts.target || '../target-project');
  const checklistPath = path.join(target, '.harness/productization/audit-checklist.yml');
  if (exists(checklistPath) && !opts.force) fail(`audit checklist already exists: ${checklistPath}`);
  writeText(checklistPath, defaultAuditChecklistContent());
  return `productization audit checklist generated: ${checklistPath}`;
}

export function cmdProductizationReport(opts, fail) {
  const target = abs(opts.target || '../target-project');
  const checklistPath = path.resolve(target, opts.checklist || '.harness/productization/audit-checklist.yml');
  if (!exists(checklistPath)) fail(`audit checklist not found: ${checklistPath}`);
  const checklist = parseAuditChecklist(readText(checklistPath, ''));
  const runInfo = readRunResult(target, opts.run);
  const { markdown } = buildProductizationReport({ checklist, runInfo });
  const output = path.resolve(target, opts.output || checklist.policy?.output || '.harness/productization/productization-report.md');
  ensureDir(path.dirname(output));
  writeText(output, markdown);
  return `productization report generated: ${output}`;
}
