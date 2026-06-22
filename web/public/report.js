let allTests        = [];
let renderedScenarios = [];
let currentFilter   = 'all';
let currentMode     = 'slider';
let isDragging      = false;

// ─── State helper ─────────────────────────────────────────────────

function displayState(s) {
  if (s.status === 'pass') return 'pass';
  if (s.misMatchPercent !== null && !s.error) return 'pending';
  return 'fail';
}

// ─── Load ─────────────────────────────────────────────────────────

async function loadReport() {
  try {
    const res = await fetch('/api/report');
    if (!res.ok) {
      showEmpty((await res.json()).error);
      return;
    }
    const data = await res.json();
    allTests = data.tests;

    const ts = data.timestamp;
    const formatted = ts
      ? `${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)} ${ts.slice(9,11)}:${ts.slice(11,13)}:${ts.slice(13,15)}`
      : ts;
    document.getElementById('run-meta').textContent = `Run: ${formatted}`;

    renderStats(allTests);
    renderScenarios(allTests);
  } catch (e) {
    console.error(e);
    showEmpty('Failed to load report. Is the server running?');
  }
}

// ─── Stats ────────────────────────────────────────────────────────

function renderStats(tests) {
  const total   = tests.length;
  const passed  = tests.filter(t => displayState(t) === 'pass').length;
  const pending = tests.filter(t => displayState(t) === 'pending').length;
  const failed  = tests.filter(t => displayState(t) === 'fail').length;
  const rate    = total ? Math.round((passed / total) * 100) : 0;

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
      <span class="stat-pill-label">Pending Review</span>
      <span class="stat-pill-value pending">${pending}</span>
    </div>
    <div class="stat-pill">
      <span class="stat-pill-label">Failed</span>
      <span class="stat-pill-value fail">${failed}</span>
    </div>
    <div class="stat-pill">
      <span class="stat-pill-label">Pass Rate</span>
      <span class="stat-pill-value ${rate === 100 ? 'pass' : rate === 0 ? 'fail' : ''}">${rate}%</span>
    </div>`;
}

// ─── Scenarios ────────────────────────────────────────────────────

function renderScenarios(tests) {
  const filtered = currentFilter === 'all'
    ? tests
    : tests.filter(t => displayState(t) === currentFilter);

  renderedScenarios = filtered;

  if (!filtered.length) {
    document.getElementById('report-content').innerHTML = `
      <div class="empty-state">
        <strong>No scenarios to show</strong>
        <p>${currentFilter === 'all' ? 'Run snapscen test to generate a report.' : 'Nothing matches this filter.'}</p>
      </div>`;
    return;
  }

  const VIEWPORT_ORDER = ['desktop', 'tablet', 'mobile'];
  const byViewport = {};

  filtered.forEach((t, idx) => {
    const vp = t.viewport.toLowerCase();
    if (!byViewport[vp]) byViewport[vp] = [];
    byViewport[vp].push({ t, idx });
  });

  const orderedViewports = [
    ...VIEWPORT_ORDER.filter(vp => byViewport[vp]),
    ...Object.keys(byViewport).filter(vp => !VIEWPORT_ORDER.includes(vp)),
  ];

  const html = orderedViewports.map(vp => {
    const items     = byViewport[vp];
    const passCount = items.filter(({ t }) => displayState(t) === 'pass').length;
    const sectionId = `section-${vp}`;

    return `
      <div class="viewport-section">
        <div class="viewport-header" onclick="toggleSection('${sectionId}')">
          <span class="viewport-toggle" id="toggle-${sectionId}">▼</span>
          <span class="viewport-name">${capitalize(vp)}</span>
          <span class="viewport-count">${items.length} pages &middot; ${passCount} passed</span>
        </div>
        <div class="viewport-grid" id="${sectionId}">
          ${items.map(({ t, idx }) => scenarioCard(t, idx)).join('')}
        </div>
      </div>`;
  }).join('');

  document.getElementById('report-content').innerHTML = html;
}

function scenarioCard(s, idx) {
  const state      = displayState(s);
  const pct        = s.misMatchPercent !== null ? s.misMatchPercent.toFixed(2) : null;
  const thumb      = s.images?.test || s.images?.reference || '';
  const canCompare = !!(s.images?.reference && s.images?.test);

  const badge = state === 'pass'
    ? `<span class="card-badge pass">&#10003;</span>`
    : `<span class="card-badge ${state}">&#10005; ${pct !== null ? pct + '%' : '&mdash;'}</span>`;

  return `
    <div class="scenario-card ${state}" ${canCompare ? `onclick="openComparison(${idx})"` : ''}>
      <div class="card-thumb">
        ${thumb
          ? `<img src="${thumb}" alt="${escHtml(s.label)}" onerror="this.style.display='none'" />`
          : `<div class="card-no-image">No image</div>`
        }
        ${badge}
      </div>
      <div class="card-info">
        <div class="card-label">${escHtml(s.label)}</div>
        <div class="card-url">${escHtml(s.url || '')}</div>
      </div>
    </div>`;
}

function toggleSection(sectionId) {
  const grid    = document.getElementById(sectionId);
  const toggle  = document.getElementById(`toggle-${sectionId}`);
  const isCollapsed = grid.classList.toggle('collapsed');
  toggle.textContent = isCollapsed ? '▶' : '▼';
}

// ─── Lightbox ─────────────────────────────────────────────────────

function openComparison(idx) {
  const s     = renderedScenarios[idx];
  const state = displayState(s);
  const pct   = s.misMatchPercent !== null ? s.misMatchPercent.toFixed(2) + '%' : null;

  // Header
  document.getElementById('lb-page').textContent = s.label;
  document.getElementById('lb-vp').textContent   = s.viewport;

  const pctEl   = document.getElementById('lb-pct');
  const sepEl   = document.getElementById('lb-sep-pct');
  if (pct) {
    pctEl.textContent  = (state === 'pass' ? '✓ ' : '✕ ') + pct;
    pctEl.className    = `lb-pct ${state}`;
    pctEl.style.display = '';
    sepEl.style.display = '';
  } else {
    pctEl.style.display = 'none';
    sepEl.style.display = 'none';
  }

  // Images
  const ref  = s.images?.reference || '';
  const test = s.images?.test      || '';
  const diff = s.images?.diff      || '';

  document.getElementById('lb-ref-s').src  = ref;
  document.getElementById('lb-test-s').src = test;
  document.getElementById('lb-ref-p').src  = ref;
  document.getElementById('lb-test-p').src = test;

  const diffImg     = document.getElementById('lb-diff');
  const diffMissing = document.getElementById('diff-missing');
  if (diff) {
    diffImg.src           = diff;
    diffImg.style.display = 'block';
    diffMissing.style.display = 'none';
  } else {
    diffImg.style.display = 'none';
    diffMissing.style.display = 'flex';
  }

  // Diff button
  const diffBtn  = document.getElementById('btn-diff');
  diffBtn.disabled = !diff;

  // Footer URLs
  const refUrlEl  = document.getElementById('lb-ref-url');
  const testUrlEl = document.getElementById('lb-test-url');
  refUrlEl.textContent  = s.referenceUrl  || '';
  refUrlEl.href         = s.referenceUrl  || '#';
  testUrlEl.textContent = s.url           || '';
  testUrlEl.href        = s.url           || '#';

  // Reset
  updateSlider(50);
  setMode('slider');
  document.getElementById('lightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
  ['lb-ref-s','lb-test-s','lb-ref-p','lb-test-p','lb-diff'].forEach(id => {
    document.getElementById(id).src = '';
  });
}

function setMode(mode) {
  currentMode = mode;
  ['slider','side','diff'].forEach(m => {
    document.getElementById(`view-${m}`).classList.toggle('hidden', m !== mode);
    document.querySelector(`.lb-mode-btn[data-mode="${m}"]`).classList.toggle('active', m === mode);
  });
}

// ─── Slider ───────────────────────────────────────────────────────

function updateSlider(pos) {
  document.getElementById('comp-ref').style.clipPath     = `inset(0 ${100 - pos}% 0 0)`;
  document.getElementById('comp-handle').style.left      = pos + '%';
  document.getElementById('lb-bar-ref').style.width      = pos + '%';
}

const compWrap = document.getElementById('comparison-wrap');

function sliderPos(clientX) {
  const rect = compWrap.getBoundingClientRect();
  return Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
}

compWrap.addEventListener('mousedown', e => {
  isDragging = true;
  updateSlider(sliderPos(e.clientX));
});

document.addEventListener('mouseup', () => { isDragging = false; });

document.addEventListener('mousemove', e => {
  if (!isDragging) return;
  updateSlider(sliderPos(e.clientX));
});

compWrap.addEventListener('touchstart', e => {
  updateSlider(sliderPos(e.touches[0].clientX));
}, { passive: true });

compWrap.addEventListener('touchmove', e => {
  e.preventDefault();
  updateSlider(sliderPos(e.touches[0].clientX));
}, { passive: false });

// Close on backdrop
document.getElementById('lightbox').addEventListener('click', e => {
  if (e.target === document.getElementById('lightbox')) closeLightbox();
});

// ─── Filters ──────────────────────────────────────────────────────

function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.className = 'filter-btn' + (btn.dataset.filter === f ? ` active-${f}` : '');
  });
  renderScenarios(allTests);
}

// ─── Helpers ──────────────────────────────────────────────────────

function capitalize(str) {
  return String(str).charAt(0).toUpperCase() + String(str).slice(1);
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showEmpty(msg) {
  document.getElementById('run-meta').textContent     = 'No report';
  document.getElementById('stats-bar').innerHTML      = '';
  document.getElementById('report-content').innerHTML = `
    <div class="empty-state">
      <strong>No report found</strong>
      <p>${escHtml(msg)}</p>
    </div>`;
}

// ─── Init ─────────────────────────────────────────────────────────

loadReport();
