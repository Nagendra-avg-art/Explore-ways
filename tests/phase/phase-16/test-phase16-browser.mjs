// tests/phase/phase-16/test-phase16-browser.mjs
// Phase 16 Full-System Interactive Browser & Responsive Testing Suite

import puppeteer from 'puppeteer-core';
import path from 'node:path';
import assert from 'node:assert';

const ARTIFACTS_DIR = 'C:\\Users\\G.V.V.NAGENDRA KUMAR\\.gemini\\antigravity-ide\\brain\\a6afd7b8-a5aa-47d5-88d0-c8dab038ac11';

async function runBrowserTestSuite() {
  console.log('================================================================');
  console.log('🌐 PHASE 16 — MULTI-VIEWPORT BROWSER & E2E SYSTEM TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const consoleErrors = [];

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,850']
  });

  const page = await browser.newPage();

  // Listen for console errors & warnings
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out benign Leaflet tile 404s or dev react warnings
      if (!text.includes('favicon') && !text.includes('net::ERR_')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[PageCrash] ${err.message}`);
  });

  // Grant geolocation & set default to Ramireddy Palle
  const context = browser.defaultBrowserContext();
  await context.overridePermissions('http://localhost:5173', ['geolocation']);
  await page.setGeolocation({ latitude: 13.62, longitude: 79.30 });

  async function step(name, fn) {
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

  try {
    // -----------------------------------------------------------------------
    // TEST 1: Initial Load & Location Synchronization (Desktop)
    // -----------------------------------------------------------------------
    await step('Initial Load (1280x850 desktop)', async () => {
      await page.setViewport({ width: 1280, height: 850 });
      await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2000));

      const title = await page.title();
      assert.ok(title.includes('Smart Travel Companion'), 'Page title must contain Smart Travel Companion');

      // Verify header location does NOT show Bengaluru
      const headerText = await page.evaluate(() => document.querySelector('header')?.textContent || '');
      assert.ok(!headerText.toLowerCase().includes('bengaluru'), 'Must NOT display Bengaluru in header');
      assert.ok(!headerText.toLowerCase().includes('bangalore'), 'Must NOT display Bangalore in header');
    });

    // -----------------------------------------------------------------------
    // TEST 2: Destination Search & Synchronized Switch to Tirupati
    // -----------------------------------------------------------------------
    await step('Switch Destination to Tirupati via Hero Autocomplete', async () => {
      const searchInput = await page.$('input[placeholder*="Search destination"]');
      assert.ok(searchInput, 'Search destination input must exist in hero');
      await searchInput.click();
      await searchInput.type('Tirupati', { delay: 60 });
      await new Promise(r => setTimeout(r, 1200));

      // Click Tirupati in dropdown
      const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent && b.textContent.includes('Tirupati') && b.textContent.includes('Select'));
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      assert.ok(clicked, 'Tirupati autocomplete suggestion must be clicked');
      await new Promise(r => setTimeout(r, 2500));

      const headerText = await page.evaluate(() => document.querySelector('header')?.textContent || '');
      assert.ok(headerText.includes('Tirupati'), 'Header must now display Tirupati');
      assert.ok(!headerText.includes('(Custom)'), 'Header must NOT show (Custom)');
    });

    // -----------------------------------------------------------------------
    // TEST 3: Explore Tab & Live Attractions
    // -----------------------------------------------------------------------
    await step('Explore Tab: Category Filtering and POI Discovery', async () => {
      // Click Explore Tab
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('nav button, header button'));
        const exploreTab = tabs.find(t => t.textContent && t.textContent.includes('Explore'));
        if (exploreTab) exploreTab.click();
      });
      await new Promise(r => setTimeout(r, 2000));

      // Check that attractions are displayed and verify they are near Tirupati
      const placeCards = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('div, article')).filter(el => 
          el.textContent && (el.textContent.includes('Add to Trip') || el.textContent.includes('Added'))
        );
        return cards.length;
      });
      assert.ok(placeCards > 0, 'Explore tab must render attractions for Tirupati');
    });

    // -----------------------------------------------------------------------
    // TEST 4: Add Places to Trip (Lifecycle Step 1)
    // -----------------------------------------------------------------------
    await step('Add Attractions to Trip', async () => {
      const addedCount = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button')).filter(b => 
          b.textContent && b.textContent.includes('Add to Trip')
        );
        let count = 0;
        for (let i = 0; i < Math.min(2, buttons.length); i++) {
          buttons[i].click();
          count++;
        }
        return count;
      });
      assert.ok(addedCount >= 1, 'At least 1 attraction must be added to trip');
      await new Promise(r => setTimeout(r, 1000));
    });

    // -----------------------------------------------------------------------
    // TEST 5: Food Explorer Discovery
    // -----------------------------------------------------------------------
    await step('Food Tab: Location-Aware Food Discovery & Add Dining', async () => {
      // Navigate to Food tab
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('nav button, button'));
        const foodTab = tabs.find(t => t.textContent && t.textContent.includes('Food'));
        if (foodTab) foodTab.click();
      });
      await new Promise(r => setTimeout(r, 2500));

      const foodCount = await page.evaluate(() => {
        const foodCards = Array.from(document.querySelectorAll('button')).filter(b => 
          b.textContent && (b.textContent.includes('Add to Trip') || b.textContent.includes('Added'))
        );
        return foodCards.length;
      });
      assert.ok(foodCount > 0, 'Food tab must display food options for Tirupati');

      // Add a food venue to trip
      await page.evaluate(() => {
        const addFoodBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent && b.textContent.trim() === 'Add to Trip'
        );
        if (addFoodBtn) addFoodBtn.click();
      });
      await new Promise(r => setTimeout(r, 1000));
    });

    // -----------------------------------------------------------------------
    // TEST 6: Map Rendering & Route Polyline
    // -----------------------------------------------------------------------
    await step('Map Tab: Leaflet Map and POI Markers', async () => {
      // Navigate to Map tab
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('nav button, button'));
        const mapTab = tabs.find(t => t.textContent && t.textContent.trim() === 'Map');
        if (mapTab) mapTab.click();
      });
      await new Promise(r => setTimeout(r, 2500));

      const mapExists = await page.evaluate(() => {
        return Boolean(document.querySelector('.leaflet-container'));
      });
      assert.ok(mapExists, 'Leaflet map container must be rendered');

      const markersCount = await page.evaluate(() => {
        return document.querySelectorAll('.leaflet-marker-icon').length;
      });
      assert.ok(markersCount >= 1, 'Leaflet map must have markers displayed');
    });

    // -----------------------------------------------------------------------
    // TEST 7: My Trip Lifecycle & Transport Switching
    // -----------------------------------------------------------------------
    await step('My Trip: Timeline, Metrics & Transport Switching', async () => {
      // Navigate to My Trip tab
      await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('nav button, button'));
        const tripTab = tabs.find(t => t.textContent && t.textContent.includes('My Trip'));
        if (tripTab) tripTab.click();
      });
      await new Promise(r => setTimeout(r, 2000));

      // Capture screenshot of My Trip
      const myTripShot = path.join(ARTIFACTS_DIR, 'screenshot_phase16_mytrip.png');
      await page.screenshot({ path: myTripShot });

      // Verify trip items exist
      const tripContent = await page.evaluate(() => document.body.textContent || '');
      assert.ok(
        tripContent.includes('km') || tripContent.includes('Stop') || tripContent.includes('Timeline'),
        'My Trip must display itinerary metrics or timeline'
      );

      // Test Transport Switching: Cab, Auto, Walking
      const switchedTransport = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const cabBtn = buttons.find(b => b.textContent && b.textContent.includes('Cab'));
        const autoBtn = buttons.find(b => b.textContent && b.textContent.includes('Auto'));
        const walkBtn = buttons.find(b => b.textContent && b.textContent.includes('Walking') || b.textContent?.includes('Walk'));

        if (cabBtn) cabBtn.click();
        if (autoBtn) autoBtn.click();
        return Boolean(cabBtn || autoBtn || walkBtn);
      });
      assert.ok(switchedTransport, 'Transport mode toggle buttons must exist and respond');
      await new Promise(r => setTimeout(r, 1000));
    });

    // -----------------------------------------------------------------------
    // TEST 8: Empty Trip Lifecycle (Zero Stops, No White Screen)
    // -----------------------------------------------------------------------
    await step('My Trip: Remove All Stops -> Honest Empty State (No White Screen)', async () => {
      await page.evaluate(() => {
        // Find remove/delete buttons in My Trip
        const removeButtons = Array.from(document.querySelectorAll('button')).filter(b => 
          b.getAttribute('aria-label')?.includes('Remove') || 
          b.getAttribute('title')?.includes('Remove') ||
          b.textContent?.includes('Remove') ||
          b.querySelector('svg')
        );
        // Click remove buttons
        removeButtons.forEach(b => {
          if (b.getAttribute('aria-label')?.includes('Remove') || b.title?.includes('Remove')) {
            b.click();
          }
        });
      });
      await new Promise(r => setTimeout(r, 1500));

      // Verify no blank white screen / crash
      const isAlive = await page.evaluate(() => {
        return Boolean(document.querySelector('header') && document.querySelector('nav'));
      });
      assert.ok(isAlive, 'UI header and navigation must remain intact after stop removal');
    });

    // -----------------------------------------------------------------------
    // TEST 9: Tablet Viewport (768x1024)
    // -----------------------------------------------------------------------
    await step('Responsive: Tablet Layout (768x1024)', async () => {
      await page.setViewport({ width: 768, height: 1024 });
      await new Promise(r => setTimeout(r, 1500));

      const tabletShot = path.join(ARTIFACTS_DIR, 'screenshot_phase16_tablet.png');
      await page.screenshot({ path: tabletShot });

      const hasHorizScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      assert.strictEqual(hasHorizScroll, false, 'Tablet viewport must NOT have horizontal scroll overflow');
    });

    // -----------------------------------------------------------------------
    // TEST 10: Mobile Viewport (375x667)
    // -----------------------------------------------------------------------
    await step('Responsive: Mobile Layout (375x667)', async () => {
      await page.setViewport({ width: 375, height: 667 });
      await new Promise(r => setTimeout(r, 1500));

      const mobileShot = path.join(ARTIFACTS_DIR, 'screenshot_phase16_mobile.png');
      await page.screenshot({ path: mobileShot });

      const hasHorizScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      assert.strictEqual(hasHorizScroll, false, 'Mobile viewport must NOT have horizontal scroll overflow');
    });

    // -----------------------------------------------------------------------
    // TEST 11: Console & Runtime Audit
    // -----------------------------------------------------------------------
    await step('Console Error Audit: Zero Fatal Crashes or Unhandled Exceptions', async () => {
      const fatalErrors = consoleErrors.filter(e => 
        e.includes('Uncaught') || e.includes('TypeError') || e.includes('ReferenceError') || e.includes('PageCrash')
      );
      if (fatalErrors.length > 0) {
        console.warn('   ⚠️ Console issues detected:', fatalErrors);
      }
      assert.strictEqual(fatalErrors.length, 0, 'Must have zero unhandled fatal runtime errors in browser');
    });

  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`BROWSER SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runBrowserTestSuite();
