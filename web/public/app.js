let config = null;
let currentSource = null;

// ─── Config ───────────────────────────────────────────────────────

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    config = await res.json();
    renderSummary(config);
  } catch {
    document.getElementById('config-content').textContent = 'Failed to load config.';
  }
}

function renderSummary(c) {
  document.getElementById('config-content').innerHTML = `
    <div class="config-item">
      <span class="config-label">ID</span>
      <span class="config-value">${c.id || '—'}</span>
    </div>
    <div class="config-item">
      <span class="config-label">Reference</span>
      <span class="config-value">${c.referenceBase || '—'}</span>
    </div>
    <div class="config-item">
      <span class="config-label">Target</span>
      <span class="config-value">${c.targetBase || '—'}</span>
    </div>
    <div class="config-item">
      <span class="config-label">Threshold</span>
      <span class="config-value">${c.misMatchThreshold ?? 1.0}%</span>
    </div>
    <div class="config-item">
      <span class="config-label">Viewports</span>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        ${(c.viewports || []).map(v => `<span class="config-value">${v.label}</span>`).join('')}
      </div>
    </div>
    <div class="config-item">
      <span class="config-label">Pages</span>
      <span class="config-value">${(c.pages || []).length} configured</span>
    </div>
  `;
}

// ─── Modal ────────────────────────────────────────────────────────

function openModal() {
  renderSettingsTab(config);
  renderPagesTab(config);
  switchTab('settings');
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function switchTab(tab) {
  document.getElementById('tab-settings').style.display = tab === 'settings' ? 'block' : 'none';
  document.getElementById('tab-pages').style.display = tab === 'pages' ? 'block' : 'none';
  document.querySelectorAll('.modal-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
}

// ─── Settings Tab ─────────────────────────────────────────────────

function renderSettingsTab(c) {
  document.getElementById('tab-settings').innerHTML = `
    <div class="form-group">
      <label>Site ID</label>
      <input class="form-input" id="field-id" type="text" value="${c.id || ''}" />
    </div>
    <div class="form-group">
      <label>Reference Base URL</label>
      <input class="form-input" id="field-referenceBase" type="url" value="${c.referenceBase || ''}" />
    </div>
    <div class="form-group">
      <label>Target Base URL</label>
      <input class="form-input" id="field-targetBase" type="url" value="${c.targetBase || ''}" />
    </div>
    <div class="form-group">
      <label>Default Threshold (%)</label>
      <input class="form-input" id="field-threshold" type="number" value="${c.misMatchThreshold ?? 1.0}" min="0" max="100" step="0.1" style="width:120px;" />
    </div>
    <div class="form-group">
      <label>Viewports</label>
      <div class="row-header">
        <span style="flex:1.5">Label</span>
        <span style="width:90px">Width</span>
        <span style="width:90px">Height</span>
      </div>
      <div id="viewports-list">
        ${(c.viewports || []).map((v, i) => viewportRow(v, i)).join('')}
      </div>
      <button class="btn-add" onclick="addViewport()">+ Add Viewport</button>
    </div>
  `;
}

function viewportRow(v, i) {
  return `
    <div class="viewport-row" id="vp-${i}">
      <input class="form-input vp-label" type="text" placeholder="Label" value="${v.label}" />
      <input class="form-input vp-dim" type="number" placeholder="Width" value="${v.width}" />
      <input class="form-input vp-dim" type="number" placeholder="Height" value="${v.height}" />
      <button class="btn-remove" onclick="this.closest('.viewport-row').remove()">✕</button>
    </div>`;
}

function addViewport() {
  const list = document.getElementById('viewports-list');
  const i = list.children.length;
  list.insertAdjacentHTML('beforeend', viewportRow({ label: '', width: 1440, height: 900 }, i));
}

// ─── Pages Tab ────────────────────────────────────────────────────

function renderPagesTab(c) {
  document.getElementById('tab-pages').innerHTML = `
    <div class="row-header">
      <span style="flex:1.2">Path</span>
      <span style="flex:1.5">Label</span>
      <span style="width:90px">Threshold</span>
    </div>
    <div id="pages-list">
      ${(c.pages || []).map((p, i) => pageRow(p, i)).join('')}
    </div>
    <button class="btn-add" onclick="addPage()">+ Add Page</button>
  `;
}

function pageRow(p, i) {
  const threshold = typeof p.misMatchThreshold === 'number' ? p.misMatchThreshold : '';
  return `
    <div class="page-row" id="pg-${i}">
      <input class="form-input path" type="text" placeholder="/path" value="${p.path}" />
      <input class="form-input label" type="text" placeholder="Label" value="${p.label}" />
      <input class="form-input threshold" type="number" placeholder="—" value="${threshold}" min="0" max="100" step="0.1" />
      <button class="btn-remove" onclick="this.closest('.page-row').remove()">✕</button>
    </div>`;
}

function addPage() {
  const list = document.getElementById('pages-list');
  const i = list.children.length;
  list.insertAdjacentHTML('beforeend', pageRow({ path: '', label: '' }, i));
}

// ─── Save ─────────────────────────────────────────────────────────

function collectFormData() {
  const viewports = [...document.querySelectorAll('#viewports-list .viewport-row')].map(row => ({
    label: row.querySelector('.vp-label').value.trim(),
    width: parseInt(row.querySelectorAll('.vp-dim')[0].value),
    height: parseInt(row.querySelectorAll('.vp-dim')[1].value),
  })).filter(v => v.label);

  const pages = [...document.querySelectorAll('#pages-list .page-row')].map(row => {
    const t = row.querySelector('.threshold').value;
    const page = {
      path: row.querySelector('.path').value.trim(),
      label: row.querySelector('.label').value.trim(),
    };
    if (t !== '') page.misMatchThreshold = parseFloat(t);
    return page;
  }).filter(p => p.path);

  return {
    id: document.getElementById('field-id').value.trim(),
    referenceBase: document.getElementById('field-referenceBase').value.trim(),
    targetBase: document.getElementById('field-targetBase').value.trim(),
    misMatchThreshold: parseFloat(document.getElementById('field-threshold').value),
    viewports,
    pages,
  };
}

async function saveConfig() {
  const updated = collectFormData();
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) throw new Error('Save failed');
    config = updated;
    renderSummary(config);
    closeModal();
  } catch (err) {
    alert(`Failed to save config: ${err.message}`);
  }
}

// ─── Commands ─────────────────────────────────────────────────────

function setStatus(state, text) {
  document.getElementById('status-dot').className = `status-dot ${state}`;
  document.getElementById('status-text').textContent = text;
}

function appendOutput(text, className = '') {
  const output = document.getElementById('output');
  const span = document.createElement('span');
  if (className) span.className = className;
  span.textContent = text;
  output.appendChild(span);
  output.scrollTop = output.scrollHeight;
}

function clearOutput() {
  document.getElementById('output').innerHTML = '';
  setStatus('', 'Ready');
}

function setButtonsDisabled(disabled) {
  document.querySelectorAll('.btn').forEach(btn => btn.disabled = disabled);
}

function runCommand(command) {
  if (currentSource) currentSource.close();

  let hasMismatch = false;

  clearOutput();
  appendOutput(`$ snapscen ${command}\n`, 'line-info');
  setStatus('running', `Running ${command}...`);
  setButtonsDisabled(true);

  currentSource = new EventSource(`/api/run/${command}`);

  currentSource.onmessage = e => {
    const data = JSON.parse(e.data);
    if (data.type === 'done') {
      currentSource.close();
      currentSource = null;
      setButtonsDisabled(false);
      if (data.code === 0) {
        appendOutput('\n✓ Completed successfully\n', 'line-success');
        setStatus('success', 'Done');
      } else if (hasMismatch) {
          appendOutput('\n◎ Mismatch found — view report to review changes\n', 'line-info');
          setStatus('running', 'Pending Review');
      } else {
        appendOutput(`\n✗ Exited with code ${data.code}\n`, 'line-error');
        setStatus('error', 'Failed');
      }
    } else {
      if (data.text && data.text.includes('Mismatch errors found')) {
        hasMismatch = true;
      }
      appendOutput(data.text);
    }
  };

  currentSource.onerror = () => {
    currentSource.close();
    currentSource = null;
    setButtonsDisabled(false);
    setStatus('error', 'Connection error');
  };
}

// ─── Init ─────────────────────────────────────────────────────────

loadConfig();
