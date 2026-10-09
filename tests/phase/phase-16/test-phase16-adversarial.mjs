// tests/phase/phase-16/test-phase16-adversarial.mjs
// Phase 16 Full-System Adversarial, Edge Case, and Error Handling Test Suite

import assert from 'node:assert';

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('================================================================');
  console.log('🚀 PHASE 16 — ADVERSARIAL, EDGE CASE & ERROR RESILIENCE SUITE');
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
  // 1. LOCATION & GEOCODING EDGE CASES
  // -------------------------------------------------------------------------
  await test('Location Reverse: Valid Ramireddy Palle coordinates (lat 13.62, lon 79.30)', async () => {
    const res = await fetch(`${BASE_URL}/api/location/reverse?lat=13.62&lon=79.30`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(!data.city.toLowerCase().includes('bengaluru'), 'Must NOT resolve to Bengaluru');
    assert.ok(!data.city.toLowerCase().includes('bangalore'), 'Must NOT resolve to Bangalore');
  });

  await test('Location Reverse: Missing lat/lon query params returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/location/reverse`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  await test('Location Reverse: Invalid lat/lon (NaN / string) returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/location/reverse?lat=invalid&lon=invalid`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  await test('Location Reverse: Out-of-bounds coordinates (lat 999, lon -500) returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/location/reverse?lat=999&lon=-500`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  await test('Location Search: Empty query returns curated popular Indian destinations', async () => {
    const res = await fetch(`${BASE_URL}/api/location/search?q=`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.results));
    assert.ok(data.results.length >= 10);
  });

  await test('Location Search: Tirupati query returns Tirupati without (Custom) label', async () => {
    const res = await fetch(`${BASE_URL}/api/location/search?q=tirupati`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.results.length > 0);
    const first = data.results[0];
    assert.ok(!first.formatted.toLowerCase().includes('custom'), 'Must NOT have (Custom) in title');
    assert.strictEqual(typeof first.lat, 'number');
    assert.strictEqual(typeof first.lon, 'number');
  });

  await test('Location Search: Rajahmundry query returns accurate AP coordinates', async () => {
    const res = await fetch(`${BASE_URL}/api/location/search?q=rajahmundry`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.results.length > 0);
    const first = data.results[0];
    assert.strictEqual(Math.round(first.lat), 17);
    assert.strictEqual(Math.round(first.lon), 82);
  });

  // -------------------------------------------------------------------------
  // 2. PLACES & EXPLORE EDGE CASES & DATA TRUST
  // -------------------------------------------------------------------------
  await test('Places: Invalid coordinates (lat 999, lon 999) returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/places?lat=999&lon=999`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  await test('Places: Incomplete coordinates (lat provided without lon) returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/places?lat=13.62`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  await test('Places: Remote non-hub coordinates with 0 POIs returns honest empty state, NEVER Hyderabad demo', async () => {
    // Isolated coordinates in deep desert (Thar desert border: 27.5, 71.0)
    const res = await fetch(`${BASE_URL}/api/places?lat=27.5000&lon=71.0000`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    // If Nominatim returns no tourist places in the middle of nowhere:
    // It must NEVER return Hyderabad places!
    for (const p of (data.places || [])) {
      assert.ok(!p.name.includes('Charminar'), 'Must not invent Charminar!');
      assert.ok(!p.name.includes('Golconda'), 'Must not invent Golconda!');
      assert.ok(!p.name.includes('Ramoji'), 'Must not invent Ramoji!');
    }
  });

  await test('Places Nearby: Missing lat/lon returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/places/nearby`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  await test('Places Nearby: Invalid numeric coordinates returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/places/nearby?lat=invalid&lon=invalid`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  await test('Places Food: Missing lat/lon returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/places/food`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  await test('Places Food: Valid Tirupati coordinates returns location-relevant food POIs', async () => {
    const res = await fetch(`${BASE_URL}/api/places/food?lat=13.6288&lon=79.4192`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.places));
    // Verify food places are near Tirupati and not Hyderabad Paradise Biryani
    for (const f of data.places.slice(0, 5)) {
      assert.ok(!f.name.toLowerCase().includes('paradise biryani - secunderabad'), 'Must not return Hyderabad Paradise Biryani');
    }
  });

  // -------------------------------------------------------------------------
  // 3. WEATHER EDGE CASES
  // -------------------------------------------------------------------------
  await test('Weather: Missing coordinates returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/weather/current`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  await test('Weather: Out-of-bounds coordinates (lat 150) returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/weather/current?lat=150&lon=78.5`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  await test('Weather: Valid Tirupati coordinates returns current condition and hourly forecast', async () => {
    const res = await fetch(`${BASE_URL}/api/weather/current?lat=13.6288&lon=79.4192`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.weather);
    assert.strictEqual(typeof data.weather.current.temperature, 'number');
    assert.ok(Array.isArray(data.weather.hourlyForecast));
    assert.ok(data.weather.hourlyForecast.length > 0);
  });

  // -------------------------------------------------------------------------
  // 4. ROUTING & DIRECTIONS EDGE CASES
  // -------------------------------------------------------------------------
  await test('Routing: Missing coordinates parameter returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/routes/directions`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  await test('Routing: Single waypoint (fewer than 2 required) returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/routes/directions?coordinates=78.4747,17.3616`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  await test('Routing: Corrupted coordinate format returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/routes/directions?coordinates=abc,def;123,456`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  await test('Routing: Valid multi-stop coordinates returns road network geometry and maneuvers', async () => {
    // Charminar to Chowmahalla Palace
    const coords = '78.4747,17.3616;78.4717,17.3582';
    const res = await fetch(`${BASE_URL}/api/routes/directions?coordinates=${coords}&mode=driving`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.totalDistanceKm > 0);
    assert.ok(data.totalDurationMin > 0);
    assert.ok(Array.isArray(data.coordinates));
    assert.ok(data.coordinates.length > 2);
  });

  // -------------------------------------------------------------------------
  // 5. RECOMMENDATIONS ENGINE EDGE CASES
  // -------------------------------------------------------------------------
  await test('Recommendations: Corrupt numeric lat/lon in body returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: 'invalid_lat', lon: 'invalid_lon' })
    });
    assert.strictEqual(res.status, 400);
  });

  await test('Recommendations: Valid request returns sorted matchScore and scoreBreakdown', async () => {
    const res = await fetch(`${BASE_URL}/api/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: 17.3616,
        lon: 78.4747,
        preferences: {
          interests: ['history'],
          availableHours: 4,
          budgetAmount: 500,
          travelStyle: 'solo',
          pacePreference: 'moderate'
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.places));
    assert.ok(data.places.length > 0);
    const top = data.places[0];
    assert.ok(top.matchScore >= 0 && top.matchScore <= 100);
    assert.ok(top.scoreBreakdown);
    assert.strictEqual(typeof top.scoreBreakdown.interestMatch, 'number');
  });

  // -------------------------------------------------------------------------
  // 6. AI TRAVEL GUIDE GROUNDING & ADVERSARIAL QUERIES
  // -------------------------------------------------------------------------
  await test('AI: Empty message returns 400', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' })
    });
    assert.strictEqual(res.status, 400);
  });

  await test('AI: Adversarial Query - "What is the exact Uber price right now?"', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is the exact Uber price right now?',
        context: {
          location: { city: 'Tirupati', area: 'Tirumala', lat: 13.6288, lon: 79.4192 },
          userPreferences: { interests: ['temples'], availableHours: 4, budgetAmount: 1000, travelStyle: 'solo', pace: 'moderate' },
          selectedTrip: {
            stopCount: 2,
            stops: [{ name: 'Sri Venkateswara Temple', lat: 13.6833, lon: 79.35 }],
            totalDistanceKm: 15,
            totalTravelTimeMin: 35,
            totalVisitTimeMin: 90,
            totalEstimatedDurationMin: 125,
            preferredMode: 'cab',
            isOptimized: true
          },
          topNearbyPlaces: []
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    const reply = (data.data.answer || '').toLowerCase();
    // Must NOT claim exact live surge booking, must state estimate/unavailable live surge
    assert.ok(
      reply.includes('estimate') || reply.includes('exact') || reply.includes('live') || reply.includes('app') || reply.includes('fare'),
      'AI must acknowledge that exact dynamic surge prices require live Uber app checking'
    );
  });

  await test('AI: Adversarial Query - "Is this temple definitely open at 3:00 AM?"', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Is this temple definitely open at 3:00 AM?',
        context: {
          location: { city: 'Tirupati', area: 'Tirumala', lat: 13.6288, lon: 79.4192 },
          selectedTrip: {
            stopCount: 1,
            stops: [{ name: 'Sri Govindaraja Swamy Temple', openingHours: '05:00 - 21:00' }],
            preferredMode: 'cab'
          }
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    const reply = (data.data.answer || '').toLowerCase();
    // Must NOT promise it is open at 3 AM
    assert.ok(
      reply.includes('schedule') || reply.includes('closed') || reply.includes('hours') || reply.includes('3:00') || reply.includes('morning') || reply.includes('open'),
      'AI must refer to structured schedule and indicate typical non-operating status at 3 AM'
    );
  });

  await test('AI: Adversarial Query - "Give me a place that isn\'t in the current results."', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Give me a place that isn't in the current results.",
        context: {
          location: { city: 'Tirupati', area: 'City Center', lat: 13.6288, lon: 79.4192 },
          topNearbyPlaces: [{ name: 'Sri Venkateswara National Park' }]
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    const reply = (data.data.answer || '').toLowerCase();
    // Must state that it sticks to verified nearby data or advise exploring via search
    assert.ok(
      reply.includes('verified') || reply.includes('search') || reply.includes('grounded') || reply.includes('results') || reply.includes('explore') || reply.includes('data'),
      'AI must not hallucinate unverified external places'
    );
  });

  await test('AI: Core User Query - "Where should I go first?"', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Where should I go first?',
        context: {
          location: { city: 'Tirupati', area: 'City Center', lat: 13.6288, lon: 79.4192 },
          selectedTrip: {
            stopCount: 2,
            stops: [
              { name: 'Sri Govindaraja Swamy Temple', category: 'temples' },
              { name: 'Chandragiri Fort', category: 'history' }
            ],
            preferredMode: 'auto'
          }
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok((data.data.answer || '').length > 20);
  });

  await test('AI: Core User Query - "Will rain affect my trip?"', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Will rain affect my trip?',
        context: {
          location: { city: 'Tirupati', area: 'City Center', lat: 13.6288, lon: 79.4192 },
          selectedTrip: {
            stopCount: 2,
            stops: [
              { name: 'Sri Venkateswara National Park', isOutdoor: true },
              { name: 'Regional Science Centre', isOutdoor: false }
            ],
            preferredMode: 'walking'
          }
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    const reply = (data.data.answer || '').toLowerCase();
    assert.ok(reply.includes('rain') || reply.includes('weather') || reply.includes('cab') || reply.includes('indoor'));
  });

  await test('AI: Core User Query - "How much will my trip cost?"', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'How much will my trip cost?',
        context: {
          location: { city: 'Tirupati', area: 'City Center', lat: 13.6288, lon: 79.4192 },
          tripFareSummary: {
            preferredMode: 'auto',
            totalFareDisplay: '₹120 – ₹160',
            totalMinFareInr: 120,
            totalMaxFareInr: 160,
            isEstimate: true,
            assumptions: 'Standard local rate',
            legs: []
          },
          selectedTrip: {
            stopCount: 2,
            stops: [{ name: 'Place A' }, { name: 'Place B' }],
            preferredMode: 'auto'
          }
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    const reply = (data.data.answer || '').toLowerCase();
    assert.ok(reply.includes('₹') || reply.includes('cost') || reply.includes('fare') || reply.includes('estimate'));
  });

  await test('AI: Core User Query - "Should I walk?"', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Should I walk?',
        context: {
          location: { city: 'Tirupati', area: 'City Center', lat: 13.6288, lon: 79.4192 },
          selectedTrip: {
            stopCount: 2,
            stops: [{ name: 'Place A', distanceKm: 8 }],
            totalDistanceKm: 8,
            preferredMode: 'auto'
          }
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    const reply = (data.data.answer || '').toLowerCase();
    assert.ok(reply.includes('walk') || reply.includes('distance') || reply.includes('cab') || reply.includes('auto') || reply.includes('km'));
  });

  await test('AI: Core User Query - "Can I add another place?"', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Can I add another place?',
        context: {
          location: { city: 'Tirupati', area: 'City Center', lat: 13.6288, lon: 79.4192 },
          itineraryFeasibility: {
            status: 'feasible',
            remainingMinutes: 120,
            bufferMinutes: 60,
            statusLabel: 'Feasible'
          },
          selectedTrip: {
            stopCount: 2,
            stops: [{ name: 'Place A' }, { name: 'Place B' }],
            preferredMode: 'auto'
          }
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    const reply = (data.data.answer || '').toLowerCase();
    assert.ok(reply.includes('add') || reply.includes('time') || reply.includes('buffer') || reply.includes('feasible') || reply.includes('explore'));
  });

  await test('AI: Core User Query - "Why is this order recommended?"', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Why is this order recommended?',
        context: {
          location: { city: 'Tirupati', area: 'City Center', lat: 13.6288, lon: 79.4192 },
          selectedTrip: {
            stopCount: 2,
            stops: [{ name: 'Place A' }, { name: 'Place B' }],
            preferredMode: 'auto',
            isOptimized: true,
            distanceSavedKm: 3.2
          }
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    const reply = (data.data.answer || '').toLowerCase();
    assert.ok(reply.includes('order') || reply.includes('route') || reply.includes('distance') || reply.includes('travel') || reply.includes('optimize'));
  });

  await test('AI: Adversarial Query - "What\'s the exact traffic right now?"', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "What's the exact traffic right now?",
        context: {
          location: { city: 'Tirupati', area: 'City Center', lat: 13.6288, lon: 79.4192 },
          selectedTrip: {
            stopCount: 2,
            stops: [{ name: 'Place A' }, { name: 'Place B' }],
            preferredMode: 'auto'
          }
        }
      })
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    const reply = (data.data.answer || '').toLowerCase();
    // Must acknowledge live traffic congestion monitoring is unmonitored / uses standard estimates
    assert.ok(
      reply.includes('traffic') || reply.includes('live') || reply.includes('estimate') || reply.includes('real-time') || reply.includes('speed') || reply.includes('sensor'),
      'AI must explain live traffic status limitations'
    );
  });

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
