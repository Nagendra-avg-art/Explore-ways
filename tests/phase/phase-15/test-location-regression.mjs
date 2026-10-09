// tests/phase/phase-15/test-location-regression.mjs
// Phase 15 Regression Suite: Verifies Location Architecture, Search, Geocoding, and Cross-Component Consistency

import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 15 LOCATION REGRESSION TEST SUITE');
  console.log('====================================================\n');

  // TEST 1: Ramireddy Palle coordinates must NEVER resolve to Bengaluru / Bangalore
  console.log('▶ TEST 1: Device GPS at Ramireddy Palle (lat: 13.62, lon: 79.30)...');
  const ramiRes = await fetch(`${BASE_URL}/api/location/reverse?lat=13.62&lon=79.30`);
  assert.strictEqual(ramiRes.status, 200, 'Reverse geocode endpoint must return 200');
  const ramiData = await ramiRes.json();
  console.log('  Resolved Address:', ramiData.formatted);
  console.log('  Full Address:', ramiData.fullAddress);
  assert.strictEqual(ramiData.success, true);
  assert.ok(
    !ramiData.city.toLowerCase().includes('bengaluru') && !ramiData.city.toLowerCase().includes('bangalore'),
    'CRITICAL FAILURE: Ramireddy Palle must NEVER resolve to Bengaluru/Bangalore!'
  );
  assert.ok(
    ramiData.city.toLowerCase().includes('tirupati') || 
    ramiData.area.toLowerCase().includes('ramireddi') ||
    ramiData.area.toLowerCase().includes('ramireddy') ||
    ramiData.city.toLowerCase().includes('current location'),
    'Location must identify Ramireddy Palle / Tirupati region or honest coordinates'
  );
  console.log('  ✅ TEST 1 PASSED: Device coordinates do NOT invent Bangalore.\n');

  // TEST 2: Distant Coordinates without Known Hub must NEVER invent Bangalore
  console.log('▶ TEST 2: Distant coordinates (lat: 20.50, lon: 85.20) without known hub...');
  const distantRes = await fetch(`${BASE_URL}/api/location/reverse?lat=20.50&lon=85.20`);
  const distantData = await distantRes.json();
  console.log('  Distant Result:', distantData.formatted);
  assert.ok(
    !distantData.city.toLowerCase().includes('bengaluru') && !distantData.city.toLowerCase().includes('bangalore'),
    'Distant coordinates must not snap to Bengaluru'
  );
  assert.ok(
    !distantData.city.toLowerCase().includes('hyderabad'),
    'Distant coordinates must not snap to Hyderabad'
  );
  console.log('  ✅ TEST 2 PASSED: Distant coordinates do not invent distant cities.\n');

  // TEST 3: Search Tirupati must NOT return "Custom" and must have REAL coordinates
  console.log('▶ TEST 3: Search for Tirupati destination...');
  const tSearchRes = await fetch(`${BASE_URL}/api/location/search?q=tirupati`);
  assert.strictEqual(tSearchRes.status, 200);
  const tSearchData = await tSearchRes.json();
  assert.ok(tSearchData.results && tSearchData.results.length > 0, 'Must return at least 1 Tirupati match');
  
  const tirupati = tSearchData.results[0];
  console.log('  Tirupati Result:', tirupati);
  assert.ok(
    !tirupati.formatted.toLowerCase().includes('custom'),
    'CRITICAL FAILURE: Tirupati must NOT be labeled as (Custom)!'
  );
  assert.ok(
    Math.abs(tirupati.lat - 13.6288) < 0.35,
    `Tirupati latitude must be ~13.6288, received: ${tirupati.lat}`
  );
  assert.ok(
    Math.abs(tirupati.lon - 79.4192) < 0.35,
    `Tirupati longitude must be ~79.4192, received: ${tirupati.lon}`
  );
  assert.ok(
    Math.abs(tirupati.lat - 17.3850) > 2.0,
    'Tirupati MUST NOT have fake Hyderabad latitude (17.3850)!'
  );
  console.log('  ✅ TEST 3 PASSED: Tirupati resolved to real AP coordinates without (Custom) label.\n');

  // TEST 4: Live Weather for Tirupati Coordinates
  console.log('▶ TEST 4: Fetch live weather for Tirupati coordinates (13.6288, 79.4192)...');
  const tWeatherRes = await fetch(`${BASE_URL}/api/weather?lat=13.6288&lon=79.4192&city=Tirupati`);
  assert.strictEqual(tWeatherRes.status, 200);
  const tWeatherData = await tWeatherRes.json();
  assert.strictEqual(tWeatherData.success, true);
  console.log('  Tirupati Weather:', {
    city: tWeatherData.weather.location.city,
    temperature: `${tWeatherData.weather.current.temperature}°C`,
    condition: tWeatherData.weather.current.condition
  });
  assert.strictEqual(tWeatherData.weather.location.city, 'Tirupati');
  assert.strictEqual(tWeatherData.weather.latitude, 13.6288);
  assert.strictEqual(tWeatherData.weather.longitude, 79.4192);
  console.log('  ✅ TEST 4 PASSED: Weather coordinates match Tirupati context.\n');

  // TEST 5: Live POIs for Tirupati must NEVER show Hyderabad Demo places
  console.log('▶ TEST 5: Discover places for Tirupati coordinates...');
  const tPlacesRes = await fetch(`${BASE_URL}/api/places/nearby?lat=13.6288&lon=79.4192`);
  assert.strictEqual(tPlacesRes.status, 200);
  const tPlacesData = await tPlacesRes.json();
  console.log('  Discovered Places Count:', tPlacesData.total, 'isLive:', tPlacesData.isLive);
  if (tPlacesData.places && tPlacesData.places.length > 0) {
    for (const p of tPlacesData.places) {
      assert.ok(
        p.name !== 'Charminar' && p.name !== 'Golconda Fort' && p.name !== 'Chowmahalla Palace',
        'CRITICAL FAILURE: Hyderabad demo places must NEVER be shown for Tirupati!'
      );
      assert.ok(
        Math.abs(p.lat - 13.6288) < 1.0,
        `Place ${p.name} is not in Tirupati region (lat: ${p.lat})`
      );
    }
  }
  console.log('  ✅ TEST 5 PASSED: Places for Tirupati contain NO Hyderabad demo data.\n');

  // TEST 6: Food Explorer for Tirupati
  console.log('▶ TEST 6: Food places for Tirupati coordinates...');
  const tFoodRes = await fetch(`${BASE_URL}/api/places/food?lat=13.6288&lon=79.4192&radius=5000`);
  assert.strictEqual(tFoodRes.status, 200);
  const tFoodData = await tFoodRes.json();
  console.log('  Food Places Count:', tFoodData.total, 'isLive:', tFoodData.isLive);
  if (tFoodData.places && tFoodData.places.length > 0) {
    for (const p of tFoodData.places) {
      assert.ok(
        p.name !== 'Paradise Biryani' && p.name !== 'Shadab Hotel' && p.name !== 'Bawarchi',
        'Hyderabad demo dining places must not appear for Tirupati'
      );
    }
  }
  console.log('  ✅ TEST 6 PASSED: Food places reflect Tirupati location.\n');

  // TEST 7: Search Rajahmundry and Verify
  console.log('▶ TEST 7: Search for Rajahmundry destination...');
  const rSearchRes = await fetch(`${BASE_URL}/api/location/search?q=rajahmundry`);
  assert.strictEqual(rSearchRes.status, 200);
  const rSearchData = await rSearchRes.json();
  assert.ok(rSearchData.results && rSearchData.results.length > 0);
  const rajahmundry = rSearchData.results[0];
  console.log('  Rajahmundry Result:', rajahmundry);
  assert.ok(!rajahmundry.formatted.toLowerCase().includes('custom'), 'Rajahmundry must not be Custom');
  assert.ok(Math.abs(rajahmundry.lat - 17.0005) < 0.25, `Rajahmundry latitude must be ~17.0005, got ${rajahmundry.lat}`);
  assert.ok(Math.abs(rajahmundry.lon - 81.8040) < 0.25, `Rajahmundry longitude must be ~81.8040, got ${rajahmundry.lon}`);
  console.log('  ✅ TEST 7 PASSED: Rajahmundry resolved accurately.\n');

  // TEST 8: Weather for Rajahmundry
  console.log('▶ TEST 8: Weather for Rajahmundry coordinates...');
  const rWeatherRes = await fetch(`${BASE_URL}/api/weather?lat=17.0005&lon=81.8040&city=Rajahmundry`);
  assert.strictEqual(rWeatherRes.status, 200);
  const rWeatherData = await rWeatherRes.json();
  assert.strictEqual(rWeatherData.weather.location.city, 'Rajahmundry');
  assert.strictEqual(rWeatherData.weather.latitude, 17.0005);
  console.log('  ✅ TEST 8 PASSED: Weather for Rajahmundry verified.\n');

  // TEST 9: Switch Back to Tirupati and Confirm State Consistency
  console.log('▶ TEST 9: Switch back to Tirupati coordinates...');
  const tWeatherRes2 = await fetch(`${BASE_URL}/api/weather?lat=13.6288&lon=79.4192&city=Tirupati`);
  const tWeatherData2 = await tWeatherRes2.json();
  assert.strictEqual(tWeatherData2.weather.location.city, 'Tirupati');
  console.log('  ✅ TEST 9 PASSED: Switching destinations refreshes back cleanly.\n');

  // TEST 10: Search for other Indian cities (Visakhapatnam, Vijayawada, Chennai)
  console.log('▶ TEST 10: Search additional Indian cities...');
  for (const city of ['visakhapatnam', 'vijayawada', 'chennai', 'goa']) {
    const res = await fetch(`${BASE_URL}/api/location/search?q=${city}`);
    const data = await res.json();
    assert.ok(data.results && data.results.length > 0, `Search for ${city} must return results`);
    assert.ok(!data.results[0].formatted.includes('Custom'), `${city} must not be labeled Custom`);
    console.log(`  ✓ ${city}:`, data.results[0].formatted, `(${data.results[0].lat}, ${data.results[0].lon})`);
  }
  console.log('  ✅ TEST 10 PASSED: All major destinations resolve without "Custom" tag.\n');

  // TEST 11: Non-matching Search returns empty results (NO fake (Custom) fallback)
  console.log('▶ TEST 11: Search non-existent query...');
  const nonExistentRes = await fetch(`${BASE_URL}/api/location/search?q=thisisnotarealcitynamelocation123`);
  const nonExistentData = await nonExistentRes.json();
  console.log('  Non-existent Search count:', nonExistentData.results?.length);
  assert.strictEqual(nonExistentData.results.length, 0, 'Non-matching search must return empty list');
  console.log('  ✅ TEST 11 PASSED: Zero synthetic fake fallbacks created.\n');

  console.log('====================================================');
  console.log('🎉 ALL 11 MANDATORY LOCATION REGRESSION TESTS PASSED');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
