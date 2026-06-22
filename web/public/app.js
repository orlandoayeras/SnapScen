let currentSource = null;

  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      const config = await res.json();
      renderConfig(config);
    } catch {
      document.getElementById('config-content').textContent = 'Failed to load config.';
    }
  }

  function renderConfig(config) {
    const pages = (config.pages || []);
    const viewports = (config.viewports || []).map(v => v.label).join(', ');

    document.getElementById('config-content').innerHTML = `
      <div class="config-item">
        <span class="config-label">ID</span>
        <span class="config-value">${config.id || '—'}</span>
      </div>
      <div class="config-item">
        <span class="config-label">Reference</span>
        <span class="config-value">${config.referenceBase || '—'}</span>
      </div>
      <div class="config-item">
        <span class="config-label">Target</span>
        <span class="config-value">${config.targetBase || '—'}</span>
      </div>
      <div class="config-item">
        <span class="config-label">Threshold</span>
        <span class="config-value">${config.misMatchThreshold ?? 1.0}%</span>
      </div>
      <div class="config-item">
        <span class="config-label">Viewports</span>
        <span class="config-value">${viewports || '—'}</span>
      </div>
      <div class="config-item" style="flex-direction:column;gap:8px;">
        <span class="config-label">Pages (${pages.length})</span>
        <div class="pages-list">
          ${pages.map(p => `<span class="page-tag">${p.path} — ${p.label}</span>`).join('')}
        </div>
      </div>
    `;
  }

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
        } else {
          appendOutput(`\n✗ Exited with code ${data.code}\n`, 'line-error');
          setStatus('error', 'Failed');
        }
      } else {
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

loadConfig();