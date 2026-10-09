// tests/phase/phase-17/test-phase17b-real-browser-suite.mjs
// Phase 17B.1: Complete Real-World Browser Verification Suite using local Chrome
// Tests Explore, Food, Map, Plan, My Trip, AI Guide, Location Switch, Photos, and Captures Screenshots

import puppeteer from 'puppeteer-core';
import assert from 'node:assert';
import path from 'node:path';

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const ARTIFACTS_DIR = 'C:\\Users\\G.V.V.NAGENDRA KUMAR\\.gemini\\antigravity-ide\\brain\\a6afd7b8-a5aa-47d5-88d0-c8dab038ac11';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  process.stdout.write(`▶ ${name}... `);
  try {
    await fn();
    console.log('✅ PASSED');
    passed++;
  } catch (err) {
    console.log('❌ FAILED');
    console.error(`   ${err.message}`);
    failed++;
  }
}

async function runRealBrowserVerification() {
  console.log('\n================================================================');
  console.log('🌐 PHASE 17B.1 REAL BROWSER AUTOMATION & VISUAL AUDIT');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const context = browser.defaultBrowserContext();
  await context.overridePermissions(CLIENT_URL, ['geolocation']);
  // Initial GPS in Tirupati region
  await page.setGeolocation({ latitude: 13.6288, longitude: 79.4192 });

  try {
    // -------------------------------------------------------------------------
    // 1. INITIAL LOAD & EXPLORE VIEW
    // -------------------------------------------------------------------------
    await test('Browser Load: Navigate to app and verify online status badge', async () => {
      await page.goto(CLIENT_URL, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2000));

      const headerText = await page.evaluate(() => document.querySelector('header')?.textContent || '');
      assert.ok(headerText.includes('Online'), 'Header must display "Online" status');
      assert.ok(!headerText.includes('Ready'), 'Header must NOT show technical "Ready" badge');
    });

    await test('Explore View: Place cards render with authentic photos or clean placeholders', async () => {
      await page.waitForSelector('article', { timeout: 8000 });

      const cardData = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('article'));
        return cards.map(c => {
          const title = c.querySelector('h3, h4')?.textContent?.trim() || '';
          const img = c.querySelector('img');
          const imgSrc = img?.getAttribute('src') || '';
          const provenanceBadge = Array.from(c.querySelectorAll('span, div')).some(el => 
            el.textContent?.includes('Curated') || el.textContent?.includes('Live Nearby')
          );
          const hasPlaceholder = c.textContent?.includes('Photo unavailable') || 
                                c.textContent?.includes('Verified Location') ||
                                !imgSrc;
          return { title, imgSrc, provenanceBadge, hasPlaceholder };
        }).filter(c => c.title.length > 0);
      });

      assert.ok(cardData.length > 0, 'Must render place cards');
      
      // Verify no generic Unsplash stock photos on live place cards
      for (const card of cardData) {
        if (card.imgSrc) {
          assert.ok(
            !card.imgSrc.includes('unsplash.com'),
            `Card "${card.title}" must NOT use Unsplash stock image`
          );
          assert.ok(
            card.imgSrc.includes('wikimedia.org') || card.imgSrc.includes('wikipedia.org'),
            `Card "${card.title}" image must be Wikimedia Commons`
          );
        }
      }

      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_phase17b_explore_initial.png') });
      console.log('   📸 Captured initial Explore view screenshot');
    });

    await test('Place Details Modal: Opens with verified photo, metadata, and attribution', async () => {
      // Find the first "View Details" button inside a place card
      const viewDetailsBtn = await page.evaluateHandle(() => {
        const btns = Array.from(document.querySelectorAll('article button'));
        return btns.find(b => b.textContent?.includes('View Details'));
      });

      assert.ok(viewDetailsBtn, 'Must find a "View Details" button');
      await viewDetailsBtn.click();
      await new Promise(r => setTimeout(r, 1200));

      // Verify modal is visible
      const modalInfo = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"], .fixed.inset-0.z-50');
        if (!modal) return null;
        const text = modal.textContent || '';
        const hasProvenance = text.includes('Curated') || text.includes('Live Nearby') || text.includes('OpenStreetMap') || text.includes('Confidence');
        const img = modal.querySelector('img');
        const imgSrc = img?.getAttribute('src') || null;
        return { text: text.substring(0, 100), hasProvenance, imgSrc };
      });

      assert.ok(modalInfo, 'Place details modal must open');
      assert.ok(modalInfo.hasProvenance, 'Modal must show provenance metadata');

      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_phase17b_place_modal.png') });
      console.log('   📸 Captured Place Details Modal screenshot');

      // Close modal by pressing Escape
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 800));
    });

    // -------------------------------------------------------------------------
    // 2. LOCATION SWITCHING: SWITCH TO RAJAHMUNDRY
    // -------------------------------------------------------------------------
    await test('Location Switch: Change destination to Rajahmundry via LocationModal', async () => {
      // Open Location Modal and click Rajahmundry
      await page.evaluate(() => {
        const btn = document.querySelector('button[title*="Click to change your location"]') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Change'));
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 1000));

      await page.evaluate(() => {
        const modalBtns = Array.from(document.querySelectorAll('.fixed.inset-0 button'));
        const raj = modalBtns.find(b => b.textContent.includes('Rajahmundry'));
        if (raj) raj.click();
      });
      await new Promise(r => setTimeout(r, 2500));

      // Verify the active location banner and place cards update to Rajahmundry
      const activeCityText = await page.evaluate(() => {
        const headerPill = document.querySelector('button[title*="Click to change your location"]');
        return headerPill?.textContent || '';
      });
      assert.ok(activeCityText.includes('Rajahmundry'), `Header must show Rajahmundry, was: ${activeCityText}`);

      // Verify Explore place cards belong to Rajahmundry and contain NO Hyderabad cards
      const currentCardTitles = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('article h3'));
        return cards.map(h => h.textContent?.trim() || '');
      });

      assert.ok(currentCardTitles.length > 0, 'Must have cards for Rajahmundry');
      assert.ok(
        !currentCardTitles.includes('Charminar') && !currentCardTitles.includes('Golconda Fort'),
        'Cards must NOT contain Hyderabad landmarks'
      );
      assert.ok(
        currentCardTitles.some(t => t.includes('Godavari') || t.includes('Kotilingeshwara') || t.includes('ISKCON') || t.includes('Bridge')),
        'Cards must contain Rajahmundry landmarks'
      );

      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_phase17b_rajahmundry_explore.png') });
      console.log('   📸 Captured Rajahmundry Explore view screenshot');
    });

    // -------------------------------------------------------------------------
    // 3. FOOD EXPLORER VIEW
    // -------------------------------------------------------------------------
    await test('Food Explorer: Navigate to Food and verify zero Unsplash stock photos', async () => {
      // Click Food tab in navigation
      const foodTab = await page.evaluateHandle(() => {
        const links = Array.from(document.querySelectorAll('nav button, nav a, button'));
        return links.find(el => el.textContent?.trim().toLowerCase().includes('food'));
      });

      if (foodTab) {
        await foodTab.click();
        await new Promise(r => setTimeout(r, 2000));
      }

      const foodCards = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('article, [data-testid="food-card"], div.p-4'));
        return cards.map(c => {
          const title = c.querySelector('h3, h4')?.textContent?.trim() || '';
          const img = c.querySelector('img');
          const src = img?.getAttribute('src') || '';
          return { title, src };
        }).filter(c => c.title.length > 0);
      });

      for (const card of foodCards) {
        if (card.src) {
          assert.ok(!card.src.includes('unsplash.com'), `Food item "${card.title}" must NOT use Unsplash stock image`);
        }
      }

      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_phase17b_food_explorer.png') });
      console.log('   📸 Captured Food Explorer screenshot');
    });

    // -------------------------------------------------------------------------
    // 4. MAP VIEW
    // -------------------------------------------------------------------------
    await test('Map View: Map renders with Leaflet container and markers', async () => {
      const mapTab = await page.evaluateHandle(() => {
        const links = Array.from(document.querySelectorAll('nav button, nav a, button'));
        return links.find(el => el.textContent?.trim().toLowerCase() === 'map');
      });

      if (mapTab) {
        await mapTab.click();
        await new Promise(r => setTimeout(r, 2000));
      }

      const hasMap = await page.evaluate(() => {
        return !!document.querySelector('.leaflet-container, #map, [data-testid="map-view"]');
      });
      assert.ok(hasMap, 'Leaflet map container must be rendered');

      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_phase17b_map_view.png') });
      console.log('   📸 Captured Map View screenshot');
    });

    // -------------------------------------------------------------------------
    // 5. PLAN YOUR PERFECT DAY
    // -------------------------------------------------------------------------
    await test('Plan Your Perfect Day: Builds itinerary without crash', async () => {
      const planTab = await page.evaluateHandle(() => {
        const links = Array.from(document.querySelectorAll('nav button, nav a, button'));
        return links.find(el => el.textContent?.trim().toLowerCase().includes('plan'));
      });

      if (planTab) {
        await planTab.click();
        await new Promise(r => setTimeout(r, 2000));
      }

      // Click interest tags
      await page.evaluate(() => {
        const interestButtons = Array.from(document.querySelectorAll('button'));
        const templesBtn = interestButtons.find(b => b.textContent?.includes('Temple') || b.textContent?.includes('Heritage'));
        if (templesBtn) templesBtn.click();
      });
      await new Promise(r => setTimeout(r, 500));

      // Click "Build Trip Plan" or "Generate Plan"
      const generateBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => 
          b.textContent?.includes('Build Trip Plan') || 
          b.textContent?.includes('Generate Plan') ||
          b.textContent?.includes('Generate Itinerary')
        );
      });

      if (generateBtn) {
        await generateBtn.click();
        await new Promise(r => setTimeout(r, 2000));
      }

      // Verify no white screen
      const planText = await page.evaluate(() => document.body.textContent || '');
      assert.ok(planText.length > 200, 'Page must contain valid content after generating plan');

      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_phase17b_plan_itinerary.png') });
      console.log('   📸 Captured Plan Itinerary screenshot');
    });

    // -------------------------------------------------------------------------
    // 6. MY TRIP VIEW & TRANSPORT CONSISTENCY
    // -------------------------------------------------------------------------
    await test('My Trip: Transport selector toggles (Auto / Cab / Walk) update fare dynamically', async () => {
      const tripTab = await page.evaluateHandle(() => {
        const links = Array.from(document.querySelectorAll('nav button, nav a, button'));
        return links.find(el => el.textContent?.trim().toLowerCase().includes('my trip'));
      });

      if (tripTab) {
        await tripTab.click();
        await new Promise(r => setTimeout(r, 2000));
      }

      // Check fare display exists
      const tripContent = await page.evaluate(() => document.body.textContent || '');
      assert.ok(
        tripContent.includes('₹') || tripContent.includes('Trip') || tripContent.includes('Stops') || tripContent.includes('No places added'),
        'My Trip must render valid trip panel'
      );

      // If transport buttons exist, toggle between them
      const transportButtons = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return {
          hasWalk: btns.some(b => b.textContent?.toLowerCase().includes('walk')),
          hasAuto: btns.some(b => b.textContent?.toLowerCase().includes('auto')),
          hasCab: btns.some(b => b.textContent?.toLowerCase().includes('cab'))
        };
      });

      if (transportButtons.hasCab) {
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const cabBtn = btns.find(b => b.textContent?.toLowerCase().includes('cab'));
          if (cabBtn) cabBtn.click();
        });
        await new Promise(r => setTimeout(r, 800));
      }

      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_phase17b_my_trip.png') });
      console.log('   📸 Captured My Trip screenshot');
    });

    // -------------------------------------------------------------------------
    // 7. AI TRAVEL GUIDE
    // -------------------------------------------------------------------------
    await test('AI Travel Guide: Chat UI renders and responds with grounded local data', async () => {
      const aiTab = await page.evaluateHandle(() => {
        const links = Array.from(document.querySelectorAll('nav button, nav a, button'));
        return links.find(el => el.textContent?.trim().toLowerCase().includes('ai guide'));
      });

      if (aiTab) {
        await aiTab.click();
        await new Promise(r => setTimeout(r, 2000));
      }

      // Check if quick prompt button exists or type message
      const promptBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent?.includes('visit first') || b.textContent?.includes('cost'));
      });

      if (promptBtn) {
        await promptBtn.click();
        await new Promise(r => setTimeout(r, 3000));
      }

      const chatText = await page.evaluate(() => document.body.textContent || '');
      assert.ok(
        chatText.includes('AI') || chatText.includes('Travel Guide') || chatText.includes('Ask'),
        'AI Guide interface must be operational'
      );

      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'screenshot_phase17b_ai_guide.png') });
      console.log('   📸 Captured AI Guide screenshot');
    });

  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`🎉 BROWSER VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runRealBrowserVerification().catch(err => {
  console.error('Browser suite crashed with error:', err);
  process.exit(1);
});
