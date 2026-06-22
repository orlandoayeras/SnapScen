// This is where you can specify the configuration for your SnapScen tests.
// You can have multiple configurations for different sites or environments.
// Each configuration should have a unique `id` and specify the `referenceBase` and `targetBase` URLs, as well as any other settings you want to apply to the tests.

// snapscen.config.js
// Fill in your values, then run: npm run reference / npm run test

module.exports = {
  // Please change the id value to match your site name.
  id: 'my-site',

  // Baseline to compare against (usually production/live)
  referenceBase: 'https://production.example.com',

  // URL being tested (staging, local, PR preview, etc.)
  targetBase: 'https://staging.example.com',

  // Site-wide threshold — 1.0 means 1% pixel difference allowed.
  // Precedence: page.misMatchThreshold > site.misMatchThreshold > 1.0 default
  misMatchThreshold: 1.0,

  // Viewports to test — remove any you don't need
  viewports: [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'tablet',  width: 1024, height: 768  },
    { label: 'mobile',  width: 375,  height: 812  },
  ],

  // Pages to capture
  pages: [
    { path: '/',        label: 'Homepage' },
    { path: '/about',   label: 'About' },
    { path: '/contact', label: 'Contact', misMatchThreshold: 2.0 }, // Example of page-specific threshold override where 2.0 is 2% difference allowed for this page
  ],
};