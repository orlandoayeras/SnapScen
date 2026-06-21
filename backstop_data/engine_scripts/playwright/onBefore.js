// onBefore.js - custom script to load cookies before each scenario

/* eslint-disable */
module.exports = async (page, scenario, vp) => {

  // Block analytics, tracking, and ad scripts before the page loads.
  // These inject dynamic content that causes false positives and slows down captures.
  await page.route('**/*', route => {
    const url = route.request().url();
    const blocklist = [
      'google-analytics.com',
      'googletagmanager.com',
      'hotjar.com',
      'doubleclick.net',
      'facebook.net',
      'connect.facebook.net',
      'analytics.twitter.com',
      'bat.bing.com',
      'segment.io',
      'amplitude.com',
      'mixpanel.com',
      'intercom.io',
      'clarity.ms',
      'ads.linkedin.com',
    ];
    if (blocklist.some(domain => url.includes(domain))) {
      return route.abort();
    }
    route.continue({
      headers: {
        ...route.request().headers(),
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache',
      }
    });
  });

  // Load cookies from a JSON file if cookiePath is set on the scenario.
  // Usage in snapscen.config.js:
  //   { path: '/dashboard', label: 'Dashboard', cookiePath: 'backstop_data/cookies.json' }
  if (scenario.cookiePath) {
    const fs = require('fs');
    const path = require('path');
    const cookieFile = path.resolve(scenario.cookiePath);
    if (fs.existsSync(cookieFile)) {
      const cookies = JSON.parse(fs.readFileSync(cookieFile, 'utf8'));
      await page.context().addCookies(cookies);
    }
  }

};