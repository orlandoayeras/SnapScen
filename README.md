# SnapScen

Hi! This is `</orlandoayeras>`. Thanks for visiting this project! If you need a tool to automate QA in your site's front page, and having a hard time setting up BackstopJS or any
other visual regression toolings/frameworks, and you are unfamiliar with the coding side, you are in luck! This tool is free! Please star this repo or you can also fork it too! Let me know if you find this useful!

Thanks and happy coding!

Visual regression testing tool for any website. Capture reference screenshots, compare them against a target environment, and catch unintended visual changes before they reach production.

Built on [BackstopJS](https://github.com/garris/BackstopJS) with Playwright.

---

## Prerequisites

- [Node.js](https://nodejs.org) v22 or higher
- npm v8 or higher

---

## OS Support

- Currently, supports macOS and Linux distributions. Windows platforms are WIP. Stay tuned!

---

## Installation

**1. Clone the repository**

```bash
git clone https://github.com/orlandoayeras/SnapScen.git
cd SnapScen
```

**2. Install dependencies**

This will also automatically download the Chromium browser required by Playwright.

```bash
npm install
```

**3. Create your config file**

Copy the example config and fill in your values.

```bash
cp snapscen.config.example.js snapscen.config.js
```

Open `snapscen.config.js` and set your `referenceBase`, `targetBase`, and `pages`.

**4. Link the CLI** *(optional — enables the `snapscen` command globally)*

```bash
npm link
```

---

## Quick Start

Capture reference screenshots:

```bash
snapscen reference
# or: npm run reference
```

Run a visual regression test:

```bash
snapscen test
# or: npm run test
```

Launch the web UI:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

---

For full usage, CLI options, config reference, and script customization, see [docs/USAGE.md](docs/USAGE.md).
