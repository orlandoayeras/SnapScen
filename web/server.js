const fs = require('fs');
const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

const backstopBin = path.resolve(__dirname, '..', 'node_modules', '.bin', 'backstop');
const configPath = path.resolve(__dirname, '..', 'backstop.config.js');
const snapscenConfigPath = path.resolve(__dirname, '..', 'snapscen.config.js');

app.use(express.static(path.join(__dirname, 'public')));
app.use('/backstop_data', express.static(path.resolve(__dirname, '..', 'backstop_data')));
app.get('/report', (req, res) => res.sendFile(path.join(__dirname, 'public', 'report.html')));
app.use(express.json());

app.get('/api/config', (req, res) => {
    try {
        delete require.cache[require.resolve(snapscenConfigPath)];
        const config = require(snapscenConfigPath);
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function spawnBackstop(command) {
    return spawn(backstopBin, [`--config=${configPath}`, command], {
        env: { ...process.env },
    });
}

app.get('/api/run/:command', (req, res) => {
    const { command } = req.params;
    if (!['reference', 'test', 'vrt', 'approve'].includes(command)) {
        return res.status(400).json({ error: 'Invalid command' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const send = (type, text) => res.write(`data: ${JSON.stringify({ type, text })}\n\n`);
    const done = code => {
        res.write(`data: ${JSON.stringify({ type: 'done', code })}\n\n`);
        res.end();
    };

    if (command === 'vrt') {
        const ref = spawnBackstop('reference');
        ref.stdout.on('data', d => send('stdout', d.toString()));
        ref.stderr.on('data', d => send('stderr', d.toString()));
        ref.on('close', code => {
            if (code !== 0) return done(code);
            send('info', '\n--- Running test ---\n');
            const test = spawnBackstop('test');
            test.stdout.on('data', d => send('stdout', d.toString()));
            test.stderr.on('data', d => send('stderr', d.toString()));
            test.on('close', done);
            req.on('close', () => test.kill());
        });
        req.on('close', () => ref.kill());
        return;
    }

    const child = spawnBackstop(command);
    child.stdout.on('data', d => send('stdout', d.toString()));
    child.stderr.on('data', d => send('stderr', d.toString()));
    child.on('close', done);
    req.on('close', () => child.kill());
});

function serializeConfig(c) {
    const viewportsStr = JSON.stringify(c.viewports, null, 2).split('\n').join('\n    ');
    const pageLines = (c.pages || []).map(p => {
        const threshold = typeof p.misMatchThreshold === 'number' ? `, misMatchThreshold: ${p.misMatchThreshold}` : '';
        return `{
            path: ${JSON.stringify(p.path)},
            label: ${JSON.stringify(p.label)}${threshold}
        },`;
    }).join('\n');

    return [
        '// snapscen.config.js',
        'module.exports = {',
        `    id: ${JSON.stringify(c.id)},`,
        `    referenceBase: ${JSON.stringify(c.referenceBase)},`,
        `    targetBase: ${JSON.stringify(c.targetBase)},`,
        `    misMatchThreshold: ${c.misMatchThreshold},`,
        `    viewports: ${viewportsStr},`,
        `    pages: [`,
        pageLines,
        `    ]`,
        `};`,
        '',
    ].join('\n');
}

app.post('/api/config', (req, res) => {
    try {
        fs.writeFileSync(snapscenConfigPath, serializeConfig(req.body), 'utf-8');
        delete require.cache[require.resolve(snapscenConfigPath)];
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/report', (req, res) => {
    const testDir = path.resolve(__dirname, '..', 'backstop_data', 'bitmaps_test');

    if (!fs.existsSync(testDir)) {
      return res.status(404).json({ error: 'No test runs found. Run snapscen test first.' });
    }

    const runs = fs.readdirSync(testDir)
      .filter(d => fs.statSync(path.join(testDir, d)).isDirectory())
      .sort()
      .reverse();

    if (!runs.length) {
      return res.status(404).json({ error: 'No test runs found. Run snapscen test first.' });
    }

    const latestRun = runs[0];
    const reportPath = path.join(testDir, latestRun, 'report.json');

    if (!fs.existsSync(reportPath)) {
      return res.status(404).json({ error: 'report.json not found for latest run.' });
    }

    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

      const tests = report.tests.map(t => ({
        label:             t.pair.label,
        viewport:          t.pair.viewportLabel,
        status:            t.status,
        misMatchPercent: t.pair.diff ? parseFloat(t.pair.diff.misMatchPercentage) : null,
        misMatchThreshold: t.pair.misMatchThreshold,
        url:               t.pair.url,
        referenceUrl:      t.pair.referenceUrl,
        error:             t.pair.error || t.pair.engineErrorMsg || null,
        images: {
          reference: `/backstop_data/bitmaps_reference/${t.pair.fileName}`,
          test:      `/backstop_data/bitmaps_test/${latestRun}/${t.pair.fileName}`,
          diff:      `/backstop_data/bitmaps_test/${latestRun}/failed_diff_${t.pair.fileName}`,
        },
      }));

      res.json({ id: report.id, timestamp: latestRun, tests });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`SnapScen server running at http://localhost:${PORT}`));
