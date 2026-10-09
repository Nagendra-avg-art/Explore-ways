import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';

const ARTIFACTS_DIR = 'C:\\Users\\G.V.V.NAGENDRA KUMAR\\.gemini\\antigravity-ide\\brain\\a6afd7b8-a5aa-47d5-88d0-c8dab038ac11';

async function runBrowserTest() {
  console.log('🌐 Launching local Chrome browser...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,850']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850 });

  // Grant geolocation and set coordinates to Ramireddy Palle (13.62, 79.30)
  const context = browser.defaultBrowserContext();
  await context.overridePermissions('http://localhost:5173', ['geolocation']);
  await page.setGeolocation({ latitude: 13.62, longitude: 79.30 });

  console.log('🌐 Navigating to http://localhost:5173/ ...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // STEP A: Initial state
  const initialShot = path.join(ARTIFACTS_DIR, 'screenshot_1_initial.png');
  await page.screenshot({ path: initialShot });
  console.log('📸 Saved initial screenshot:', initialShot);

  const initialCity = await page.evaluate(() => {
    const el = document.querySelector('header span.truncate') || document.querySelector('header');
    return el?.textContent || '';
  });
  console.log('  Initial Header Location:', initialCity);

  // STEP B: Search Tirupati in Hero search box
  console.log('🔍 Searching Tirupati in Hero search bar...');
  const searchInput = await page.$('input[placeholder*="Search destination"]');
  if (searchInput) {
    await searchInput.click();
    await searchInput.type('Tirupati', { delay: 100 });
    await new Promise(r => setTimeout(r, 1500));

    const searchShot = path.join(ARTIFACTS_DIR, 'screenshot_2_search_tirupati.png');
    await page.screenshot({ path: searchShot });
    console.log('📸 Saved search autocomplete screenshot:', searchShot);

    // Look for suggestion dropdown item for Tirupati
    const suggestionBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && b.textContent.includes('Tirupati') && b.textContent.includes('Select'));
    });

    if (suggestionBtn && suggestionBtn.asElement()) {
      console.log('👉 Clicking Tirupati dropdown suggestion...');
      await suggestionBtn.asElement().click();
    } else {
      console.log('👉 Clicking Tirupati popular pill...');
      const pill = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent && b.textContent.trim() === 'Tirupati');
      });
      if (pill && pill.asElement()) await pill.asElement().click();
    }
  }

  await new Promise(r => setTimeout(r, 2500));

  // STEP C: Confirm Tirupati selected
  const tirupatiShot = path.join(ARTIFACTS_DIR, 'screenshot_3_tirupati_home.png');
  await page.screenshot({ path: tirupatiShot });
  console.log('📸 Saved Tirupati home view screenshot:', tirupatiShot);

  const tirupatiHeader = await page.evaluate(() => {
    const el = document.querySelector('header span.truncate');
    return el?.textContent || '';
  });
  console.log('  Header after Tirupati selection:', tirupatiHeader);

  // STEP D: Inspect Map view
  console.log('🗺️ Switching to Map tab...');
  const mapNavBtn = await page.evaluateHandle(() => {
    const navButtons = Array.from(document.querySelectorAll('header nav button, nav button'));
    return navButtons.find(b => b.textContent && b.textContent.includes('Map'));
  });
  if (mapNavBtn && mapNavBtn.asElement()) {
    await mapNavBtn.asElement().click();
    await new Promise(r => setTimeout(r, 2500));

    const mapShot = path.join(ARTIFACTS_DIR, 'screenshot_4_tirupati_map.png');
    await page.screenshot({ path: mapShot });
    console.log('📸 Saved Tirupati map view screenshot:', mapShot);
  }

  // STEP E: Inspect Food view
  console.log('🍴 Switching to Food tab...');
  const foodNavBtn = await page.evaluateHandle(() => {
    const navButtons = Array.from(document.querySelectorAll('header nav button, nav button'));
    return navButtons.find(b => b.textContent && b.textContent.includes('Food'));
  });
  if (foodNavBtn && foodNavBtn.asElement()) {
    await foodNavBtn.asElement().click();
    await new Promise(r => setTimeout(r, 2500));

    const foodShot = path.join(ARTIFACTS_DIR, 'screenshot_5_tirupati_food.png');
    await page.screenshot({ path: foodShot });
    console.log('📸 Saved Tirupati food view screenshot:', foodShot);
  }

  // STEP F: Switch Destination to Rajahmundry
  console.log('🏙️ Switching Destination to Rajahmundry...');
  const changeBtn = await page.evaluateHandle(() => {
    const buttons = Array.from(document.querySelectorAll('header button'));
    return buttons.find(b => b.textContent && b.textContent.includes('Change'));
  });
  if (changeBtn && changeBtn.asElement()) {
    await changeBtn.asElement().click();
    await new Promise(r => setTimeout(r, 1000));

    // In modal, click Rajahmundry
    const rajahmundryModalBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent && b.textContent.includes('Rajahmundry'));
    });
    if (rajahmundryModalBtn && rajahmundryModalBtn.asElement()) {
      await rajahmundryModalBtn.asElement().click();
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const rajahmundryShot = path.join(ARTIFACTS_DIR, 'screenshot_6_rajahmundry.png');
  await page.screenshot({ path: rajahmundryShot });
  console.log('📸 Saved Rajahmundry screenshot:', rajahmundryShot);

  const rajahmundryHeader = await page.evaluate(() => {
    const el = document.querySelector('header span.truncate');
    return el?.textContent || '';
  });
  console.log('  Header after Rajahmundry selection:', rajahmundryHeader);

  await browser.close();
  console.log('✅ Browser test finished successfully!');
}

runBrowserTest().catch(err => {
  console.error('❌ Browser test error:', err);
  process.exit(1);
});
