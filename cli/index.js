#!/usr/bin/env node
const { program } = require('commander');
const { execSync } = require('child_process');
const path = require('path');

const configPath = path.resolve(__dirname, '..', 'backstop.config.js');
const backstopBin = path.resolve(__dirname, '..', 'node_modules', '.bin', 'backstop');

function run(command, options = {}) {
    const env = { ...process.env };
    if (options.threshold !== undefined) {
        env.SNAPSCEN_THRESHOLD = String(options.threshold);
    }
    try {
        execSync(`${backstopBin} --config=${configPath} ${command}`, { stdio: 'inherit', env });
    } catch {
        process.exit(1);
    }
}

program
    .name('snapscen')
    .description('Visual regression testing for any website')
    .version('1.0.0');

program
    .command('reference')
    .description('Capture reference screenshots')
    .option('--threshold <number>', 'Override mismatch threshold', parseFloat)
    .action((options) => run('reference', options));

program
    .command('test')
    .description('Run visual regression tests against reference screenshots')
    .option('--threshold <number>', 'Override mismatch threshold', parseFloat)
    .action((options) => run('test', options));

program
    .command('vrt')
    .description('Run both reference and test commands sequentially')
    .option('--threshold <number>', 'Override mismatch threshold', parseFloat)
    .action((options) => {
        run('reference', options);
        run('test', options);
    });

program
    .command('approve')
    .description('Approve failed screenshots as new references')
    .action(() => run('approve'));

program.parse(process.argv);