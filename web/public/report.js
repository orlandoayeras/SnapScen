let allTests = [];
let currentFilter = 'all';

async function loadReport() {
  try {
    const res = await fetch('/api/report');
    if (!res.ok) {
      const err = await res.json();
      showEmpty(err.error);
      return;
    }
    const data = await res.json();
    allTests = data.tests;

    // Format timestamp: 20260621-164355 → 2026-06-21 16:43:55
    const ts = data.timestamp;
    const formatted = ts
      ? `${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)} ${ts.slice(9,11)}:${ts.slice(11,13)}:${ts.slice(13,15)}`
      : ts;
    document.getElementById('run-meta').textContent = `Run: ${formatted}`;

    renderStats(allTests);
    renderScenarios(allTests);
  } catch {
    showEmpty('Failed to load report. Is the server running?');
  }
}

function renderStats(tests) {
  const total  = tests.length;
  const passed = tests.filter(t => t.status === 'pass').length;
  const failed = total - passed;
  const rate   = total ? Math.round((passed / total) * 100) : 0;

  document.getElementById('stats-bar').innerHTML = `
    <div class="stat-pill">
      <span class="stat-pill-label">Total</span>
      <span class="stat-pill-value">${total}</span>
    </div>
    <div class="stat-pill">
      <span class="stat-pill-label">Passed</span>
      <span class="stat-pill-value pass">${passed}</span>
    </div>
    <div class="stat-pill">
      <span class="stat-pill-label">Failed</span>
      <span class="stat-pill-value fail">${failed}</span>
    </div>
    <div class="stat-pill">
      <span class="stat-pill-label">Pass Rate</span>
      <span class="stat-pill-value ${rate === 100 ? 'pass' : rate === 0 ? 'fail' : ''}">${rate}%</span>
    </div>
  `;
}

function renderScenarios(tests) {
  const filtered = currentFilter === 'all' ? tests
    : tests.filter(t => t.status === currentFilter);

  if (!filtered.length) {
    document.getElementById('report-content').innerHTML = `
      <div class="empty-state">
        <strong>No ${currentFilter === 'all' ? '' : currentFilter + ' '}scenarios</strong>
        <p>${currentFilter === 'all' ? 'Run snapscen test to generate a report.' : 'Nothing to show for this filter.'}</p>
      </div>`;
    return;
  }

  // Group by page label
  const byPage = {};
  filtered.forEach(t => {
    if (!byPage[t.label]) byPage[t.label] = [];
    byPage[t.label].push(t);
  });

  const html = Object.entries(byPage).map(([label, scenarios]) => {
    const allPass   = scenarios.every(s => s.status === 'pass');
    const passCount = scenarios.filter(s => s.status === 'pass').length;
    const url       = scenarios[0]?.url || '';

    return `
      <div class="page-section">
        <div class="page-header">
          <h2>${escHtml(label)}</h2>
          <span class="page-url">${escHtml(url)}</span>
          <span class="page-badge ${allPass ? 'all-pass' : 'has-fail'}">
            ${passCount}/${scenarios.length} passed
          </span>
        </div>
        <div class="viewport-grid">
          ${scenarios.map(s => scenarioCard(s)).join('')}
        </div>
      </div>`;
  }).join('');

  document.getElementById('report-content').innerHTML = html;
}

function scenarioCard(s) {
  const isError = !!s.error && s.misMatchPercent === null;
  const pct  = s.misMatchPercent !== null ? `${s.misMatchPercent}%` : '—';
  const over = s.misMatchPercent !== null && s.misMatchPercent > s.misMatchThreshold;

  const header = `
    <div class="scenario-header">
      <span class="viewport-tag">${escHtml(s.viewport)}</span>
      <span class="status-badge ${s.status}">${s.status}</span>
      <span class="mismatch-pct ${over ? 'over' : ''}">${pct}</span>
    </div>`;

  if (isError) {
    const msg = (s.error || '').split('\n')[0];
    return `
      <div class="scenario-card ${s.status}">
        ${header}
        <div class="error-body">
          <div class="error-msg">${escHtml(msg)}</div>
        </div>
      </div>`;
  }

  const showDiff = s.status === 'fail';

  return `
    <div class="scenario-card ${s.status}">
      ${header}
      <div class="image-grid">
        ${imagePane('Reference', s.images.reference)}
        ${imagePane('Test', s.images.test)}
        ${showDiff
          ? imagePane('Diff', s.images.diff)
          : '<div class="image-pane"><div class="pane-label">Diff</div><div class="pane-missing">No diff</div></div>'
        }
      </div>
    </div>`;
}

function imagePane(label, src) {
  return `
    <div class="image-pane">
      <div class="pane-label">${label}</div>
      <img
        class="pane-img"
        src="${src}"
        alt="${label}"
        onclick="openLightbox('${src}')"
        onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<div class=\\'pane-missing\\'>Not available</div>')"
      />
    </div>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.className = 'filter-btn' + (btn.dataset.filter === f ? ` active${f !== 'all' ? '-' + f : ''}` : '');
  });
  renderScenarios(allTests);
}

function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  document.getElementById('lightbox-img').src = '';
}

function showEmpty(msg) {
  document.getElementById('run-meta').textContent = 'No report';
  document.getElementById('stats-bar').innerHTML = '';
  document.getElementById('report-content').innerHTML = `
    <div class="empty-state">
      <strong>No report found</strong>
      <p>${escHtml(msg)}</p>
    </div>`;
}

loadReport();
