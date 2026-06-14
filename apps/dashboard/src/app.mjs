import { loadDashboardFixtures, summarizeDashboardFixtures } from './fixture-loader.mjs';

const views = [
  { id: 'project-state', label: 'Project State' },
  { id: 'runs', label: 'Runs' },
  { id: 'artifacts', label: 'Artifacts' },
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
      ${metric('Task', state.summary.taskId)}
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
  const run = fixtures.runResult;
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>Recent Run</h2>
        <span>${escapeHtml(run.adapter ?? 'adapter pending')}</span>
      </div>
      <dl class="details">
        ${detail('Run ID', run.runId)}
        ${detail('Status', run.status)}
        ${detail('Reason Code', run.reasonCode ?? 'none')}
        ${detail('Execution Mode', run.execution?.mode)}
      </dl>
    </section>
  `;
}

function artifactsView(fixtures) {
  const artifacts = fixtures.runResult.artifacts ?? [];
  return `
    <section class="panel">
      <div class="panel-heading">
        <h2>Artifacts</h2>
        <span>${artifacts.length} files</span>
      </div>
      <ul class="list">
        ${artifacts.map(item => `<li><span>${escapeHtml(item.path)}</span><code>${escapeHtml(item.kind)}</code></li>`).join('')}
      </ul>
    </section>
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
  return '<section class="panel"><h1>Loading dashboard fixtures...</h1></section>';
}

function errorView(error) {
  return `<section class="panel error"><h1>Fixture load failed</h1><p>${escapeHtml(error.message)}</p></section>`;
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

window.addEventListener('hashchange', start);
