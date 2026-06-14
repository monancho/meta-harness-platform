import { loadDashboardFixtures, summarizeDashboardFixtures } from './fixture-loader.mjs';

const views = [
  { id: 'project-state', label: 'Project State' },
  { id: 'runs', label: 'Runs' },
  { id: 'artifacts', label: 'Artifacts' },
  { id: 'patch-diff', label: 'Patch Diff' },
  { id: 'policies', label: 'Policies' },
  { id: 'settings', label: 'Settings' }
];

const root = document.querySelector('#app');
const fixtureBase = root?.dataset.fixtureBase || './fixtures';

start();

async function start() {
  renderShell({ loading: true });
  try {
    const fixtures = await loadDashboardFixtures({ basePath: fixtureBase });
    renderShell({ fixtures, summary: summarizeDashboardFixtures(fixtures) });
  } catch (error) {
    renderShell({ error });
  }
}

function renderShell(state) {
  const activeView = currentView();
  root.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">MH</span>
        <div>
          <strong>Meta Harness</strong>
          <span>Dashboard Preview</span>
        </div>
      </div>
      <nav class="nav" aria-label="Dashboard views">
        ${views.map(view => navItem(view, activeView)).join('')}
      </nav>
    </aside>
    <main class="content">
      ${state.loading ? loadingView() : state.error ? errorView(state.error) : dashboardView(activeView, state)}
    </main>
  `;
}

function navItem(view, activeView) {
  const active = view.id === activeView ? ' aria-current="page"' : '';
  return `<a href="#${view.id}"${active}>${escapeHtml(view.label)}</a>`;
}

function dashboardView(activeView, state) {
  const title = views.find(view => view.id === activeView)?.label ?? 'Project State';
  return `
    <header class="page-header">
      <div>
        <p class="eyebrow">Local fixture mode</p>
        <h1>${escapeHtml(title)}</h1>
      </div>
      <div class="status-pill">${escapeHtml(state.summary.phase)}</div>
    </header>
    <section class="summary-grid" aria-label="Fixture summary">
      ${metric('Project', state.summary.projectId)}
      ${metric('Runs', state.summary.runCount)}
      ${metric('Last Run', state.summary.lastRunStatus)}
      ${metric('Artifacts', state.summary.artifactCount)}
    </section>
    ${viewBody(activeView, state.fixtures, state.summary)}
  `;
}

function viewBody(activeView, fixtures, summary) {
  if (activeView === 'project-state') return projectStateView(fixtures, summary);
  if (activeView === 'runs') return runsView(fixtures);
  if (activeView === 'artifacts') return artifactsView(fixtures);
  if (activeView === 'patch-diff') return patchDiffView(fixtures);
  if (activeView === 'policies') return policiesView(fixtures);
  return settingsView(fixtures);
}

function projectStateView(fixtures, summary) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>Factory State</h2>
        <span>${escapeHtml(summary.managedFileCount)} managed files</span>
      </div>
      <dl class="details">
        ${detail('Project ID', fixtures.state.projectId)}
        ${detail('Phase', fixtures.state.phase)}
        ${detail('Last Result Hash', fixtures.state.lastRunResultHash)}
        ${detail('Generator', fixtures.manifest.generator?.version)}
      </dl>
    </section>
  `;
}

function runsView(fixtures) {
  const history = fixtures.runHistory ?? { state: 'empty', runs: [], errors: [] };
  if (history.state === 'empty' || history.runs.length === 0) {
    return emptyPanel('Run History', 'No harness run directories were found.');
  }
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>Run History</h2>
        <span>${history.runs.length} runs</span>
      </div>
      ${history.errors?.length ? runErrors(history.errors) : ''}
      <div class="run-table" role="table" aria-label="Harness run history">
        <div class="run-row run-head" role="row">
          <span role="columnheader">Status</span>
          <span role="columnheader">Task</span>
          <span role="columnheader">Adapter</span>
          <span role="columnheader">Duration</span>
          <span role="columnheader">Timestamp</span>
        </div>
        ${history.runs.map(run => runRow(run)).join('')}
      </div>
    </section>
  `;
}

function artifactsView(fixtures) {
  const runs = fixtures.runHistory?.runs ?? [];
  const artifacts = runs.flatMap(run => run.artifacts.map(artifact => ({ ...artifact, runId: run.runId, status: run.status })));
  if (artifacts.length === 0) {
    return emptyPanel('Artifacts', 'No run artifacts were found.');
  }
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>Artifacts</h2>
        <span>${artifacts.length} files</span>
      </div>
      <ul class="list artifact-list">
        ${artifacts.map(item => artifactItem(item)).join('')}
      </ul>
    </section>
  `;
}

function patchDiffView(fixtures) {
  const diff = fixtures.patchDiff;
  if (!diff || diff.state === 'empty') {
    return emptyPanel('Patch Diff', 'No patch.diff content was found in the fixture source.');
  }
  const summary = diff.summary;
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>Patch Diff</h2>
        <span>${escapeHtml(diff.state)}</span>
      </div>
      <section class="diff-summary" aria-label="Patch summary">
        ${metric('Files Changed', summary.filesChanged)}
        ${metric('Additions', `+${summary.additions}`)}
        ${metric('Deletions', `-${summary.deletions}`)}
        ${metric('Risky Paths', summary.riskyPaths.length)}
      </section>
      ${summary.riskyPaths.length ? riskyPathWarnings(summary.riskyPaths) : ''}
      ${diff.malformedLines.length ? malformedPatchWarning(diff.malformedLines) : ''}
      ${summary.truncated ? truncationNotice(summary) : ''}
      <div class="diff-file-list">
        ${renderDiffFiles(diff.files, summary.maxDisplayLines).join('')}
      </div>
    </section>
  `;
}

function renderDiffFiles(files, maxDisplayLines) {
  let remainingLines = maxDisplayLines;
  return files.map(file => {
    const renderedHunks = [];
    for (const hunk of file.hunks) {
      if (remainingLines <= 0) break;
      const allowed = Math.max(0, remainingLines - 1);
      const visibleLines = hunk.lines.slice(0, allowed);
      remainingLines -= visibleLines.length + 1;
      renderedHunks.push(diffHunk(hunk, visibleLines, visibleLines.length < hunk.lines.length));
    }

    return `
      <article class="diff-file">
        <header class="diff-file-header">
          <div>
            <strong>${escapeHtml(file.displayPath)}</strong>
            <small>${escapeHtml(file.oldPath)} → ${escapeHtml(file.newPath)}</small>
          </div>
          <span><b>+${file.additions}</b> <b>-${file.deletions}</b></span>
        </header>
        ${file.riskyMatches.length ? fileRiskBadges(file.riskyMatches) : ''}
        ${renderedHunks.length ? renderedHunks.join('') : '<p class="diff-empty">No hunks were parsed for this file.</p>'}
      </article>
    `;
  });
}

function diffHunk(hunk, lines, truncated) {
  return `
    <section class="diff-hunk">
      <div class="diff-hunk-header">${escapeHtml(hunk.header)}</div>
      <pre class="diff-lines">${lines.map(diffLine).join('')}${truncated ? `<span class="diff-line meta">... hunk truncated</span>` : ''}</pre>
    </section>
  `;
}

function diffLine(line) {
  const prefix = line.kind === 'add' ? '+' : line.kind === 'delete' ? '-' : line.kind === 'context' ? ' ' : '';
  return `<span class="diff-line ${escapeAttribute(line.kind)}">${escapeHtml(prefix + line.text)}</span>`;
}

function riskyPathWarnings(matches) {
  return `
    <div class="inline-error" role="alert">
      ${matches.map(match => `<p>Forbidden path warning: <code>${escapeHtml(match.path)}</code> matches <code>${escapeHtml(match.pattern)}</code></p>`).join('')}
    </div>
  `;
}

function malformedPatchWarning(lines) {
  const visible = lines.slice(0, 5);
  const suffix = lines.length > visible.length ? `<p>${lines.length - visible.length} more malformed lines hidden.</p>` : '';
  return `
    <div class="inline-warning" role="alert">
      ${visible.map(line => `<p>Malformed patch line ${line.lineNumber}: ${escapeHtml(line.reason)}</p>`).join('')}
      ${suffix}
    </div>
  `;
}

function truncationNotice(summary) {
  return `
    <div class="inline-warning">
      <p>Patch display is limited to ${escapeHtml(summary.maxDisplayLines)} lines. Summary counts include the full patch.</p>
    </div>
  `;
}

function fileRiskBadges(matches) {
  return `
    <ul class="risk-badges">
      ${matches.map(match => `<li><code>${escapeHtml(match.path)}</code> matches <code>${escapeHtml(match.pattern)}</code></li>`).join('')}
    </ul>
  `;
}

function policiesView(fixtures) {
  return `
    <section class="two-column">
      ${scopePanel('Editable Scope', fixtures.taskPacket.editableScope)}
      ${scopePanel('Forbidden Scope', fixtures.taskPacket.forbiddenScope)}
    </section>
  `;
}

function settingsView(fixtures) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>Settings Placeholder</h2>
        <span>read-only MVP</span>
      </div>
      <dl class="details">
        ${detail('Fixture Source', fixtures.source)}
        ${detail('Backend', 'not required')}
        ${detail('Mode', 'static preview')}
      </dl>
    </section>
  `;
}

function scopePanel(title, items = []) {
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>${escapeHtml(title)}</h2>
        <span>${items.length} rules</span>
      </div>
      <ul class="list">
        ${items.map(item => `<li><span>${escapeHtml(item)}</span></li>`).join('')}
      </ul>
    </section>
  `;
}

function metric(label, value) {
  return `<article class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function detail(label, value) {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value ?? 'unknown')}</dd></div>`;
}

function loadingView() {
  return '<section class="panel state-panel"><h1>Loading dashboard fixtures...</h1><p>Reading local run history and policy fixtures.</p></section>';
}

function errorView(error) {
  return `<section class="panel error state-panel"><h1>Fixture load failed</h1><p>${escapeHtml(error.message)}</p></section>`;
}

function currentView() {
  const id = location.hash.replace(/^#/, '');
  return views.some(view => view.id === id) ? id : 'project-state';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function runRow(run) {
  return `
    <div class="run-row" role="row">
      <span role="cell"><strong class="status-text ${statusClass(run.status)}">${escapeHtml(run.status)}</strong></span>
      <span role="cell">${escapeHtml(run.taskId)}</span>
      <span role="cell">${escapeHtml(run.adapter)}</span>
      <span role="cell">${escapeHtml(formatDuration(run.durationMs))}</span>
      <span role="cell">${escapeHtml(formatTimestamp(run.timestamp))}</span>
    </div>
  `;
}

function artifactItem(item) {
  return `
    <li>
      <span>
        <a href="${escapeAttribute(item.href)}">${escapeHtml(item.fileName || item.path)}</a>
        <small>${escapeHtml(item.runId)}</small>
      </span>
      <code>${escapeHtml(item.kind)}</code>
    </li>
  `;
}

function runErrors(errors) {
  return `
    <div class="inline-error" role="alert">
      ${errors.map(error => `<p>${escapeHtml(error.runId)}: ${escapeHtml(error.message)}</p>`).join('')}
    </div>
  `;
}

function emptyPanel(title, message) {
  return `
    <section class="panel state-panel">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
    </section>
  `;
}

function formatDuration(value) {
  if (typeof value !== 'number') return 'unknown';
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} s`;
}

function formatTimestamp(value) {
  if (!value || value === 'unknown') return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

function statusClass(status) {
  return status === 'passed' ? 'passed' : status === 'failed' ? 'failed' : 'unknown';
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

window.addEventListener('hashchange', start);
