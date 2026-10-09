// tests/phase/phase-16/test-phase16-media-status.mjs
// Phase 16 Media & Status Polish Verification Suite

import puppeteer from 'puppeteer-core';
import assert from 'node:assert';
import path from 'node:path';

const BASE_URL = 'http://localhost:5000';
const CLIENT_URL = 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\G.V.V.NAGENDRA KUMAR\\.gemini\\antigravity-ide\\brain\\a6afd7b8-a5aa-47d5-88d0-c8dab038ac11';

async function runMediaStatusTests() {
  console.log('================================================================');
  console.log('🚀 TESTING FINAL MEDIA + STATUS POLISH');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`▶ ${name}... `);
      await fn();
      console.log('✅ PASSED');
      passed++;
    } catch (err) {
      console.log('❌ FAILED');
      console.error('   ', err.message);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // 1. BACKEND API TESTS: VERIFIED PHOTO LOOKUP
  // -------------------------------------------------------------------------
  await test('Photo API: Real landmark lookup returns authentic photo (Chandragiri Fort)', async () => {
    const res = await fetch(`${BASE_URL}/api/places/photo?name=Chandragiri%20Fort&lat=13.5828&lon=79.3175`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.hasPhoto, true);
    assert.ok(data.imageUrl && data.imageUrl.includes('wikimedia.org'), 'Must return authentic Wikimedia URL');
  });

  await test('Photo API: Real landmark lookup returns authentic photo (Godavari Arch Bridge)', async () => {
    const res = await fetch(`${BASE_URL}/api/places/photo?name=Godavari%20Arch%20Bridge&lat=17.00&lon=81.77`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.hasPhoto, true);
    assert.ok(data.imageUrl && data.imageUrl.includes('wikimedia.org'));
  });

  await test('Photo API: Non-existent / obscure shop returns null, NEVER random stock photo', async () => {
    const res = await fetch(`${BASE_URL}/api/places/photo?name=RandomUnmappedKiosk9999`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.hasPhoto, false);
    assert.strictEqual(data.imageUrl, null);
  });

  await test('Nearby POIs: Does NOT assign generic category stock photos to live places', async () => {
    const res = await fetch(`${BASE_URL}/api/places/nearby?lat=13.6288&lon=79.4192`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    // For places without a verified article, imageUrl should be empty string or verified photo, NOT Unsplash stock
    for (const p of data.places || []) {
      if (p.imageUrl) {
        assert.ok(p.imageUrl.includes('wikimedia.org') || p.imageUrl.includes('wikipedia.org'), 'Must be verified photo');
      }
    }
  });

  // -------------------------------------------------------------------------
  // 2. BROWSER VERIFICATION: STATUS INDICATOR & PLACE PHOTOS
  // -------------------------------------------------------------------------
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,850']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850 });

  const context = browser.defaultBrowserContext();
  await context.overridePermissions(CLIENT_URL, ['geolocation']);
  await page.setGeolocation({ latitude: 13.62, longitude: 79.30 });

  try {
    await test('Browser Load: Navigate to app and check Online indicator', async () => {
      await page.goto(CLIENT_URL, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2000));

      const statusText = await page.evaluate(() => {
        const header = document.querySelector('header');
        return header?.textContent || '';
      });

      assert.ok(
        statusText.includes('Online'),
        'Header must display "Online" status (NOT "Ready")'
      );
      assert.ok(
        !statusText.includes('Ready'),
        'Header must NOT contain developer-oriented "Ready"'
      );
    });

    await test('Browser Status: Tooltip does NOT expose developer jargon', async () => {
      const tooltip = await page.evaluate(() => {
        const badge = Array.from(document.querySelectorAll('header [title]')).find(d => 
          d.textContent && d.textContent.includes('Online')
        );
        return badge?.getAttribute('title') || '';
      });

      assert.ok(tooltip.includes('Connected to travel services'), `Tooltip must be user-friendly, got: "${tooltip}"`);
      assert.ok(!tooltip.toLowerCase().includes('backend'), 'Tooltip must NOT mention backend');
    });

    await test('Browser Explore: Place cards render with photo or clean placeholder (no broken icons)', async () => {
      // Click Explore
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('nav button'));
        const exploreTab = tabs.find(t => t.textContent && t.textContent.includes('Explore'));
        if (exploreTab) exploreTab.click();
      });
      await new Promise(r => setTimeout(r, 2000));

      // Check all rendered images for errors
      const brokenImagesCount = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter(img => img.naturalWidth === 0 && img.complete).length;
      });
      assert.strictEqual(brokenImagesCount, 0, 'Must have zero broken image elements');

      // Verify that cards without photos show the clean "Verified Location" placeholder
      const placeholderFound = await page.evaluate(() => {
        const texts = Array.from(document.querySelectorAll('span')).map(s => s.textContent || '');
        return texts.some(t => t.includes('Verified Location'));
      });
      assert.ok(placeholderFound, 'Must show clean "Verified Location" placeholder for places without verified photos');
    });

    await test('Browser Place Details Modal: Opens with clean photo/placeholder without errors', async () => {
      // Click "View Details" on the first place card to open modal
      await page.evaluate(() => {
        const detailsButtons = Array.from(document.querySelectorAll('button')).filter(b => 
          b.textContent && b.textContent.includes('View Details')
        );
        if (detailsButtons[0]) detailsButtons[0].click();
      });
      await new Promise(r => setTimeout(r, 1000));

      const modalOpen = await page.evaluate(() => {
        return Boolean(document.querySelector('[role="dialog"]'));
      });
      assert.ok(modalOpen, 'Place details modal must open');

      // Close modal
      await page.evaluate(() => {
        const closeBtn = document.querySelector('[role="dialog"] button');
        if (closeBtn) closeBtn.click();
      });
      await new Promise(r => setTimeout(r, 500));
    });

    await test('Browser My Trip: Add place and verify trip renders without broken media', async () => {
      // Add place
      await page.evaluate(() => {
        const addBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent && b.textContent.includes('Add to Trip')
        );
        if (addBtn) addBtn.click();
      });
      await new Promise(r => setTimeout(r, 800));

      // Go to My Trip
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('nav button'));
        const tripTab = tabs.find(t => t.textContent && t.textContent.includes('My Trip'));
        if (tripTab) tripTab.click();
      });
      await new Promise(r => setTimeout(r, 1500));

      const brokenInTrip = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter(img => img.naturalWidth === 0 && img.complete).length;
      });
      assert.strictEqual(brokenInTrip, 0, 'Zero broken images in My Trip');
    });

    // Capture screenshot of final polished UI
    const polishedShot = path.join(ARTIFACTS_DIR, 'screenshot_phase16_media_polish.png');
    await page.screenshot({ path: polishedShot });
    console.log('📸 Captured polished UI screenshot:', polishedShot);

  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`MEDIA & STATUS SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMediaStatusTests();
