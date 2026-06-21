// onReady.js - custom script to perform actions after the page is loaded but before the screenshot is takent.

/* eslint-disable */
module.exports = async (page, scenario, vp) => {
  console.log('SCENARIO > ' + scenario.label);

  // Reload and wait for network to fully settle
  await page.reload({ waitUntil: 'networkidle' });

  // Inject jQuery if not already present — used by several cleanup steps below
  const hasJQuery = await page.evaluate(() => typeof window.jQuery !== 'undefined');
  if (!hasJQuery) {
    try {
      await page.addScriptTag({ url: 'https://code.jquery.com/jquery-3.7.1.slim.min.js' });
    } catch (err) {
      console.warn(`[${scenario.label}] jQuery CDN injection failed (likely CSP-blocked):
  ${err.message}`);
    }
  }

  // Force lazy images to load eagerly before scrolling
  await page.evaluate(() => {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      img.setAttribute('loading', 'eager');
    });
  });

  // Handle data-src style lazy loaders
  await page.evaluate(() => {
    document.querySelectorAll('img[data-src], img[data-lazy-src], img[data-lazy]').forEach(img => {
      const src = img.dataset.src || img.dataset.lazySrc || img.dataset.lazy;
      if (src) img.src = src;
    });
  });

  // Scroll through the page to trigger lazy-loaded images and content
  const bodyHandle = await page.$('body');
  const { height } = await bodyHandle.boundingBox();
  await bodyHandle.dispose();
  const viewportHeight = page.viewportSize().height;
  let scrolled = 0;
  while (scrolled + viewportHeight < height) {
    await page.evaluate(h => window.scrollBy(0, h), viewportHeight);
    await page.waitForTimeout(1000);
    scrolled += viewportHeight;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => {
    return Array.from(document.querySelectorAll('img')).every(img =>
      img.complete && (img.naturalWidth > 0 || img.src === '' || img.src.startsWith('data:'))
    );
  }, { timeout: 15000 }).catch(() => {
    console.warn(`[${scenario.label}] Some images failed to load within 15 seconds`);
  });
  await page.waitForTimeout(300);

  // Stop all running intervals — prevents animation-driven content from shifting between captures
  await page.evaluate(() => {
    for (let i = 1; i < 99999; i++) window.clearInterval(i);
  });

  // Pause and rewind all videos
  await page.evaluate(() => {
    document.querySelectorAll('video').forEach(v => {
      if (!v.paused) { v.pause(); v.currentTime = 0; }
    });
  });

  // Stop embedded YouTube videos via postMessage
  await page.evaluate(() => {
    document.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach(iframe => {
      iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
    });
  });

  // Hide cookie/GDPR consent banners
  await page.evaluate(() => {
    [
      '.cookie-banner', '.cookie-bar', '.cookie-notice', '.cookie-consent', '.cookie-popup',
      '#cookie-banner', '#cookie-bar', '#cookie-notice', '#cookie-consent', '#cookie-popup',
      '.gdpr-banner', '.gdpr-notice', '.gdpr-consent', '#gdpr-banner',
      '.cc-window',                  // CookieConsent.js
      '#CybotCookiebotDialog',       // Cookiebot
      '.eu-cookie-compliance',       // Drupal
      '#onetrust-banner-sdk',        // OneTrust
      '.optanon-alert-box-wrapper',  // OneTrust (legacy)
      '[id*="cookie-consent"]',
      '[class*="cookie-banner"]',
    ].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.style.display = 'none');
    });
  });

  // Dismiss common popups and overlays by triggering close buttons
  await page.evaluate(() => {
    [
      '.mfp-close', '.modal-close', '.popup-close', '.overlay-close',
      'button.close', '.btn-close',
      '[aria-label="Close"]', '[aria-label="Dismiss"]',
      '#CybotCookiebotDialogBodyButtonAccept',
      '[id*="cookie"] button',
      '[class*="cookie"] button',
    ].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.click());
    });
  });

  // Remove ads — content changes every load and causes false positives
  await page.evaluate(() => {
    [
      '[id^="google_ads_iframe"]',
      '.adsbygoogle',
      'ins.adsbygoogle',
      '[class*="ad-unit"]',
      '[class*="adunit"]',
    ].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });
  });

  // Remove social media embeds — live content causes false positives
  await page.evaluate(() => {
    [
      '.twitter-timeline', '.twitter-tweet',
      'iframe[src*="twitter.com"]',
      'iframe[src*="instagram.com"]',
      'iframe[src*="facebook.com/plugins"]',
      '#sb_instagram',
    ].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });
  });

  // Fix 100vh full-height sections — renders inconsistently across environments
  await page.evaluate(() => {
    document.querySelectorAll('[style*="height: 100vh"], [style*="min-height: 100vh"]').forEach(el => {
      el.style.height = '800px';
      el.style.minHeight = 'auto';
    });
  });

  // Clean whitespace text nodes from the DOM
  await page.evaluate(() => {
    function clean(node) {
      for (let n = 0; n < node.childNodes.length; n++) {
        const child = node.childNodes[n];
        if (child.nodeType === 8 || (child.nodeType === 3 && !/\S/.test(child.nodeValue))) {
          node.removeChild(child); n--;
        } else if (child.nodeType === 1) {
          clean(child);
        }
      }
    }
    clean(document.body);
  });
};
