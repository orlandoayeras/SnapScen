# Usage Guide

## Table of Contents

- [CLI](#cli)
- [Web UI](#web-ui)
- [Config Reference](#config-reference)
- [Threshold Explained](#threshold-explained)
- [Customizing Scripts](#customizing-scripts)

---

## CLI

After running `npm link`, the `snapscen` command is available globally.

### Commands

| Command | Description |
|---|---|
| `snapscen reference` | Capture baseline screenshots |
| `snapscen test` | Compare current site against the baseline |
| `snapscen vrt` | Run reference then test in one step |
| `snapscen approve` | Promote failed screenshots as the new baseline |

### Options

**`--threshold <number>`** — Override the mismatch threshold for this run only. 2.0 means 2.0% in threshold.

```bash
snapscen test --threshold 2.0
snapscen vrt --threshold 0.5
```

### npm scripts

If you prefer not to use the CLI, the same commands are available as npm scripts:

```bash
npm run reference
npm run test
npm run vrt
npm run approve
npm run open-report
```

---

## Web UI

Start the local web server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Features

**Config panel** — Shows a summary of your current `snapscen.config.js`. Click **Edit Config** to open the editor.

**Edit Config modal** — Two tabs:
- **Settings** — Edit site ID, reference URL, target URL, default threshold, and viewports. Add or remove viewports as needed.
- **Pages** — Edit, add, or remove pages. Set a per-page threshold to override the site-wide default.

Saving from the modal writes directly back to `snapscen.config.js`.

**Commands** — Run reference, test, vrt, or approve from the browser. Output streams live to the console panel below.

**View Report** — Opens the custom SnapScen report at `/report` in a new tab after a test run.

---

## Report

The report is available at `http://localhost:3000/report` after running `npm run dev` and executing at least one `snapscen test`.

### Status types

| Status | Meaning |
|---|---|
| **Passed** | Screenshots matched within the threshold |
| **Pending Review** | A visual difference was detected — a human needs to decide if it's intentional or a bug |
| **Failed** | A technical error occurred (engine error, missing reference file, etc.) |

The distinction between Pending Review and Failed is important: Pending Review means the test ran successfully and found a pixel difference above the threshold. Failed means something went wrong before a comparison could be made.

### Stats bar

Shows total scenarios, passed count, pending review count, failed count, and overall pass rate for the latest run.

### Filters

Use the **All / Passed / Pending Review / Failed** buttons to narrow the report to a specific status.

### Viewport sections

Scenarios are grouped by viewport (Desktop, Tablet, Mobile). Each section shows the page count and how many passed. Click the section header to collapse or expand it.

### Scenario cards

Each card shows a thumbnail of the test screenshot with a status badge overlay (✓ for passed, ✕ + mismatch % for pending/failed). Below the thumbnail: the page label and URL. Click any card to open the comparison lightbox.

### Comparison lightbox

Three view modes, switchable via the **Side / Slider / Diff** buttons in the top-right:

- **Slider** — Drag horizontally across the image to reveal the reference on the left and the test on the right. A yellow divider line marks the split. The color bar at the top (red = reference, blue = test) tracks the divider position.
- **Side** — Reference and test images displayed side by side at full width, scrollable together for detailed comparison.
- **Diff** — Shows the BackstopJS diff image with pixel differences highlighted in magenta. For passed scenarios, shows "No diff image available (this page passed)." instead.

The footer of the lightbox shows the reference and test URLs as clickable links.

---

## Config Reference

All configuration lives in `snapscen.config.js` at the project root.

```js
module.exports = {
  // Unique identifier for this project
  id: 'my-site',

  // The baseline URL to compare against (usually production/live)
  referenceBase: 'https://production.example.com',

  // The URL being tested (staging, local, PR preview, etc.)
  targetBase: 'https://staging.example.com',

  // Site-wide mismatch threshold (see Threshold Explained below)
  misMatchThreshold: 1.0,

  // Viewports to capture — remove any you don't need
  viewports: [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'tablet',  width: 1024, height: 768  },
    { label: 'mobile',  width: 375,  height: 812  },
  ],

  // Pages to capture
  pages: [
    { path: '/',        label: 'Homepage' },
    { path: '/about',   label: 'About' },
    { path: '/contact', label: 'Contact', misMatchThreshold: 2.0 },
  ],
};
```

### Page options

| Field | Required | Description |
|---|---|---|
| `path` | Yes | URL path appended to `referenceBase` / `targetBase` |
| `label` | Yes | Display name shown in the report |
| `misMatchThreshold` | No | Per-page threshold override |

---

## Threshold Explained

The threshold controls how much pixel difference is allowed before a test fails. It is expressed as a percentage of total pixels.

**Precedence — highest to lowest:**

1. `--threshold` CLI flag (overrides everything for that run)
2. `page.misMatchThreshold` (per-page setting)
3. `site.misMatchThreshold` (site-wide default in config)
4. `1.0` (built-in default)

**Examples:**

```
0.1  →  0.1% difference allowed — tight, good for static pages
1.0  →  1% difference allowed — reasonable default
5.0  →  5% difference allowed — useful for pages with dynamic content
```

---

## Customizing Scripts

### `onReady.js`

Located at `backstop_data/engine_scripts/playwright/onReady.js`.

Runs after the page has loaded, before the screenshot is taken. The default script handles:

- Scrolling through the page to trigger lazy-loaded images
- Clearing animation intervals for consistent captures
- Pausing videos
- Hiding cookie banners and common overlays
- Removing ads and social media embeds
- Fixing `100vh` sections that render inconsistently

To add site-specific behaviour, edit this file directly or add steps at the bottom.

```js
module.exports = async (page, scenario, vp) => {
  // ... default steps ...

  // Your custom steps:
  await page.evaluate(() => {
    document.querySelector('.your-element')?.remove();
  });
};
```

### `onBefore.js`

Located at `backstop_data/engine_scripts/playwright/onBefore.js`.

Runs before the page navigates. The default script:

- Blocks analytics and tracking scripts (Google Analytics, GTM, Hotjar, etc.)
- Loads cookies from a file if `cookiePath` is set on a page

**Loading cookies for auth-gated pages:**

Add `cookiePath` to any page in `snapscen.config.js`:

```js
{ path: '/dashboard', label: 'Dashboard', cookiePath: 'backstop_data/cookies.json' }
```

Then create `backstop_data/cookies.json`:

```json
[
  {
    "name": "session",
    "value": "your-session-token",
    "domain": ".example.com",
    "path": "/"
  }
]
```
