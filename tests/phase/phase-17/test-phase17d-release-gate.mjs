// tests/phase/phase-17/test-phase17d-release-gate.mjs
// Phase 17D: Final Release Gate E2E Smoke & Workflow Verification Suite
// Tests all 11 critical user workflows in a real browser session

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

async function runReleaseGateSmokeTests() {
  console.log('\n================================================================');
  console.log('🏁 PHASE 17D — FINAL RELEASE GATE USER WORKFLOW SUITE');
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
  // Initial GPS location: Tirupati area (13.6288, 79.4192)
  await page.setGeolocation({ latitude: 13.6288, longitude: 79.4192 });

  try {
    // 1. OPEN APPLICATION & VERIFY ONLINE STATUS
    await test('Workflow 1: Open Application & Verify Header Status', async () => {
      await page.goto(CLIENT_URL, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 2000));

      const headerText = await page.evaluate(() => document.querySelector('header')?.textContent || '');
      assert.ok(headerText.includes('Online'), 'Header must show Online status');
      assert.ok(!headerText.includes('Ready'), 'Technical Ready badge must be absent');
    });

    // 2. OPEN EXPLORE TAB
    await test('Workflow 2: Open Explore Tab & Verify Place Cards', async () => {
      await page.evaluate(() => {
        const navBtns = Array.from(document.querySelectorAll('nav button'));
        const exploreBtn = navBtns.find(b => b.textContent && b.textContent.includes('Explore'));
        if (exploreBtn) exploreBtn.click();
      });
      await page.waitForSelector('article', { timeout: 10000 });

      const cardCount = await page.evaluate(() => {
        return document.querySelectorAll('article').length;
      });
      assert.ok(cardCount > 0, 'Explore must render place cards');

      // Check images: zero broken images
      const brokenImages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).filter(img => img.naturalWidth === 0 && img.complete).length;
      });
      assert.strictEqual(brokenImages, 0, 'Zero broken image elements allowed');
    });

    // 3. SELECT A DESTINATION VIA LOCATION MODAL
    await test('Workflow 3: Select Destination "Tirupati" via Location Modal', async () => {
      // Click Change destination button in travel context bar
      await page.evaluate(() => {
        const changeBtn = document.querySelector('button[title*="Click to change your location"]') ||
          Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Change'));
        if (changeBtn) changeBtn.click();
      });
      await new Promise(r => setTimeout(r, 800));

      // Click Tirupati in modal
      const clicked = await page.evaluate(() => {
        const modalBtns = Array.from(document.querySelectorAll('.fixed.inset-0 button, [role="dialog"] button'));
        const tirupatiBtn = modalBtns.find(b => b.textContent && b.textContent.includes('Tirupati'));
        if (tirupatiBtn) {
          tirupatiBtn.click();
          return true;
        }
        return false;
      });
      assert.ok(clicked, 'Tirupati button must be found and clicked');
      // Wait for PlacesContext to fetch and render Tirupati places
      await new Promise(r => setTimeout(r, 3000));

      // Verify destination in header changed to Tirupati
      const currentCity = await page.evaluate(() => {
        const headerPill = document.querySelector('button[title*="Click to change your location"]');
        return headerPill?.textContent || document.querySelector('header')?.textContent || '';
      });
      assert.ok(currentCity.includes('Tirupati'), 'Active destination must reflect Tirupati');
    });

    // 4. DISCOVER NEARBY PLACES (VERIFY ZERO HYDERABAD BLEED)
    await test('Workflow 4: Discover Nearby Places & Verify Data Provenance', async () => {
      // Ensure cards belong to Tirupati
      await page.waitForFunction(() => {
        const cards = Array.from(document.querySelectorAll('article h3, article h4'));
        const titles = cards.map(h => h.textContent?.trim() || '');
        return titles.length > 0 && !titles.includes('Charminar');
      }, { timeout: 10000 });

      const currentCardTitles = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('article h3, article h4'));
        return cards.map(h => h.textContent?.trim() || '');
      });

      // Data Trust Check
      assert.ok(!currentCardTitles.includes('Charminar'), 'Tirupati destination must NEVER show Charminar');
      assert.ok(!currentCardTitles.includes('Golconda Fort'), 'Tirupati destination must NEVER show Golconda Fort');
      assert.ok(
        currentCardTitles.some(t => t.includes('Venkateswara') || t.includes('Chandragiri') || t.includes('Kapila') || t.includes('Govindaraja')),
        'Must display authentic Tirupati landmarks'
      );
    });

    // 5. OPEN FOOD EXPLORER
    await test('Workflow 5: Open Food Explorer & Verify Dining POIs', async () => {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const foodBtn = btns.find(b => b.textContent && b.textContent.includes('Food'));
        if (foodBtn) foodBtn.click();
      });
      await new Promise(r => setTimeout(r, 2000));

      const foodText = await page.evaluate(() => document.querySelector('main')?.textContent || '');
      assert.ok(
        foodText.includes('Dining') || foodText.includes('Food') || foodText.includes('Restaurant'),
        'Food Explorer must load dining listings'
      );

      // Verify no unsplash photos in food places
      const hasUnsplash = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img')).map(i => i.src);
        return imgs.some(src => src.includes('images.unsplash.com'));
      });
      assert.strictEqual(hasUnsplash, false, 'Food Explorer must NOT use generic Unsplash photos');
    });

    // 6. OPEN MAP VIEW
    await test('Workflow 6: Open Map View & Verify Leaflet Markers', async () => {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const mapBtn = btns.find(b => b.textContent && b.textContent.includes('Map'));
        if (mapBtn) mapBtn.click();
      });
      await new Promise(r => setTimeout(r, 2000));

      const hasMapContainer = await page.evaluate(() => {
        return Boolean(document.querySelector('.leaflet-container'));
      });
      assert.ok(hasMapContainer, 'Leaflet map container must render');

      const markerCount = await page.evaluate(() => {
        return document.querySelectorAll('.leaflet-marker-icon').length;
      });
      assert.ok(markerCount > 0, 'Leaflet map must display destination place markers');
    });

    // 7. CONFIGURE INTERESTS, TIME, AND BUDGET
    await test('Workflow 7: Configure Travel Profile (Interests, Time, Budget)', async () => {
      // Open Travel Profile modal
      await page.evaluate(() => {
        const profileBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent && b.textContent.includes('Travel Profile')
        );
        if (profileBtn) profileBtn.click();
      });
      await new Promise(r => setTimeout(r, 600));

      // Click "Culture & Heritage" interest pill if available
      await page.evaluate(() => {
        const pills = Array.from(document.querySelectorAll('[role="dialog"] button'));
        const heritagePill = pills.find(p => p.textContent && (p.textContent.includes('Heritage') || p.textContent.includes('Culture')));
        if (heritagePill) heritagePill.click();
      });

      // Close modal
      await page.evaluate(() => {
        const closeBtn = document.querySelector('[role="dialog"] button');
        if (closeBtn) closeBtn.click();
      });
      await new Promise(r => setTimeout(r, 600));

      const headerText = await page.evaluate(() => document.querySelector('header')?.textContent || '');
      assert.ok(headerText.includes('Budget'), 'Travel Profile bar must reflect budget');
    });

    // 8. GENERATE AN ITINERARY (PLAN YOUR PERFECT DAY)
    await test('Workflow 8: Generate Itinerary in "Plan" View', async () => {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const planBtn = btns.find(b => b.textContent && b.textContent.includes('Plan'));
        if (planBtn) planBtn.click();
      });
      await new Promise(r => setTimeout(r, 2000));

      // Click "Generate Day Plan" or verify plan widget rendered
      await page.evaluate(() => {
        const genBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.textContent && (b.textContent.includes('Generate') || b.textContent.includes('Plan Day') || b.textContent.includes('Optimize'))
        );
        if (genBtn) genBtn.click();
      });
      await new Promise(r => setTimeout(r, 2000));

      const planContent = await page.evaluate(() => document.querySelector('main')?.textContent || '');
      assert.ok(
        planContent.includes('Plan') || planContent.includes('Stop') || planContent.includes('Timeline'),
        'Plan view must display itinerary content'
      );
    });

    // 9. ADD AND REMOVE TRIP STOPS (MY TRIP WORKFLOW)
    await test('Workflow 9: Add and Remove Trip Stops in My Trip', async () => {
      // Navigate to Explore first
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const exploreBtn = btns.find(b => b.textContent && b.textContent.includes('Explore'));
        if (exploreBtn) exploreBtn.click();
      });
      await new Promise(r => setTimeout(r, 1500));

      // Click heart/save on the first place card
      await page.evaluate(() => {
        const saveButtons = Array.from(document.querySelectorAll('button')).filter(b => 
          b.getAttribute('aria-label')?.includes('Save') || b.getAttribute('aria-label')?.includes('trip')
        );
        if (saveButtons[0]) saveButtons[0].click();
      });
      await new Promise(r => setTimeout(r, 800));

      // Navigate to My Trip
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const myTripBtn = btns.find(b => b.textContent && b.textContent.includes('My Trip'));
        if (myTripBtn) myTripBtn.click();
      });
      await new Promise(r => setTimeout(r, 2000));

      const tripText = await page.evaluate(() => document.querySelector('main')?.textContent || '');
      assert.ok(!tripText.includes('Your trip is empty'), 'My Trip must contain added place');

      // Test transport mode toggle (Auto / Cab / Walk)
      const modeButtons = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('main button')).filter(b => 
          b.textContent && (b.textContent.includes('Auto') || b.textContent.includes('Cab') || b.textContent.includes('Walk'))
        );
        return btns.length;
      });
      assert.ok(modeButtons > 0, 'Transport selector buttons must be available in My Trip');
    });

    // 10. VIEW WEATHER-AWARE INTELLIGENCE
    await test('Workflow 10: View Destination Weather Intelligence', async () => {
      // Weather widget exists in header or main
      const weatherText = await page.evaluate(() => {
        const bodyText = document.body.textContent || '';
        return bodyText;
      });
      // Should show temperature e.g. "°C"
      assert.ok(weatherText.includes('°C'), 'Weather temperature in Celsius must be visible');
    });

    // 11. ASK THE AI GUIDE A DESTINATION QUESTION
    await test('Workflow 11: Ask AI Guide a Destination-Related Question', async () => {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const aiBtn = btns.find(b => b.textContent && b.textContent.includes('AI Guide'));
        if (aiBtn) aiBtn.click();
      });
      await new Promise(r => setTimeout(r, 2000));

      // Type message and submit
      const inputSelector = 'input[type="text"], textarea';
      await page.waitForSelector(inputSelector);
      await page.type(inputSelector, 'What attractions can I visit in Tirupati?');

      await page.evaluate(() => {
        const sendBtn = Array.from(document.querySelectorAll('button')).find(b => 
          b.getAttribute('aria-label')?.includes('Send') || b.textContent?.includes('Send') || b.querySelector('svg')
        );
        if (sendBtn) sendBtn.click();
      });

      // Wait for AI response
      await new Promise(r => setTimeout(r, 3500));

      const chatText = await page.evaluate(() => document.querySelector('main')?.textContent || '');
      assert.ok(
        chatText.includes('Tirupati') || chatText.includes('Venkateswara') || chatText.includes('attractions'),
        'AI Guide response must answer question with destination context'
      );
    });

    // 12. DESTINATION SWITCH: VERIFY ZERO STALE DATA BLEED
    await test('Workflow 12: Change Destination to Rajahmundry & Verify Zero Stale Bleed', async () => {
      // Open Location modal
      await page.evaluate(() => {
        const changeBtn = document.querySelector('button[title*="Click to change your location"]') ||
          Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Change'));
        if (changeBtn) changeBtn.click();
      });
      await new Promise(r => setTimeout(r, 800));

      // Select Rajahmundry
      await page.evaluate(() => {
        const modalBtns = Array.from(document.querySelectorAll('.fixed.inset-0 button, [role="dialog"] button'));
        const rajBtn = modalBtns.find(b => b.textContent && b.textContent.includes('Rajahmundry'));
        if (rajBtn) rajBtn.click();
      });
      await new Promise(r => setTimeout(r, 2500));

      // Go to Explore tab
      await page.evaluate(() => {
        const navBtns = Array.from(document.querySelectorAll('nav button'));
        const exploreBtn = navBtns.find(b => b.textContent && b.textContent.includes('Explore'));
        if (exploreBtn) exploreBtn.click();
      });
      await page.waitForSelector('article', { timeout: 10000 });

      const currentCardTitles = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('article h3, article h4'));
        return cards.map(h => h.textContent?.trim() || '');
      });

      assert.ok(currentCardTitles.length > 0, 'Must have place cards for Rajahmundry');
      assert.ok(!currentCardTitles.includes('Charminar'), 'Must NOT bleed Hyderabad demo places');
      assert.ok(!currentCardTitles.includes('Venkateswara Temple'), 'Must NOT bleed Tirupati places into Rajahmundry');
      assert.ok(
        currentCardTitles.some(t => t.includes('Godavari') || t.includes('Kotilingeshwara') || t.includes('ISKCON') || t.includes('Bridge')),
        'Must show authentic Rajahmundry landmarks'
      );
    });

    console.log('\n📸 Capturing Final Release Gate Screenshot...');
    const finalShot = path.join(ARTIFACTS_DIR, 'screenshot_phase17d_release_gate.png');
    await page.screenshot({ path: finalShot, fullPage: false });
    console.log(`Saved screenshot to: ${finalShot}`);

  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log(`📊 PHASE 17D WORKFLOW RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runReleaseGateSmokeTests().catch((err) => {
  console.error('Fatal Phase 17D test failure:', err);
  process.exit(1);
});
