// backstop.config.js - replaced generic backstop.json with dynamic config that reads from snapscen.config.js and supports custom scripts
const path = require('path');
const fs = require('fs');

const configPath = path.resolve(__dirname, 'snapscen.config.js');
if (!fs.existsSync(configPath)) {
  throw new Error(`Config not found: ${configPath}`);
}


const site = require(configPath);
const targetBase = site.targetBase || null;

// Hardcoded default onReadyScript and onBeforeScript path (can be overridden by site-specific config)
const customOnReadyPath = path.resolve(__dirname, 'backstop_data', 'onReady.js');
const customOnBeforePath = path.resolve(__dirname, 'backstop_data', 'onBefore.js');


// This will build scenarios from pages

const defaultReferenceBase = site.referenceBase || targetBase;

// Resolve misMatchThreshold per scenario.
const DEFAULT_THRESHOLD = 1.0;
const envThreshold = null; // Placeholder for future CLI/env threshold parsing logic

function resolveThreshold(page) {
  if (envThreshold !== null && Number.isFinite(envThreshold)) return envThreshold;
  if (typeof page.misMatchThreshold === 'number') return page.misMatchThreshold;
  if (typeof site.misMatchThreshold === 'number') return site.misMatchThreshold;
  return DEFAULT_THRESHOLD;
}

const scenarios = site.pages.map(page => {
  if (!page.url && !targetBase && !defaultReferenceBase) {
    throw new Error(`Page "${page.label}" has no explicit url and no targetBase was provided`);
  }
  return {
    label: page.label,
    url: page.url ?? `${targetBase ?? defaultReferenceBase}${page.path}`,
    referenceUrl: page.referenceUrl ?? `${defaultReferenceBase}${page.path ?? ''}`,
    ...(site.httpAuth && { httpAuth: site.httpAuth }),
    ...(site.waitUntil && { waitUntil: site.waitUntil }),
    selectors: ['document'],
    delay: 300,
    requireSameDimensions: false,
    misMatchThreshold: resolveThreshold(page)
  };
});

module.exports = {
  id: site.id,
  viewports: site.viewports || [
    { label: 'desktop', width: 1440, height: 900 },

  ],
  scenarios,
  paths: {
    bitmaps_reference: 'backstop_data/bitmaps_reference',
    bitmaps_test: 'backstop_data/bitmaps_test',
    engine_scripts: 'backstop_data/engine_scripts',
    html_report: 'backstop_data/html_report',
    ci_report: 'backstop_data/ci_report'
  },
  report: ['browser'],
  engine: 'playwright',

  onBeforeScript,
  onReadyScript,

  asyncCaptureLimit: 5,
  asyncCompareLimit: 50,
  navigationTimeout: 120000
};
