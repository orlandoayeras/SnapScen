const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

const backstopBin = path.resolve(__dirname, '..', 'node_modules', '.bin', 'backstop');
const configPath = path.resolve(__dirname, '..', 'backstop.config.js');
const snapscenConfigPath = path.resolve(__dirname, '..', 'snapscen.config.js');

app.use(express.static(path.join(__dirname, 'public')));
app.use('/report', express.static(path.resolve(__dirname, '..', 'backstop_data', 'html_report')));

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

app.listen(PORT, () => console.log(`SnapScen server running at http://localhost:${PORT}`));
