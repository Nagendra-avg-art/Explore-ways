// tests/phase/phase-17/test-phase17b-real-world-data.mjs
// Phase 17B: Comprehensive Test Suite for Real-World Place & Photo Data Foundation
// Verifies ₹0-First Production Architecture, Providers, Deduplication, Categories, and Demo Isolation

import assert from 'node:assert';

const BASE_URL = process.env.TEST_SERVER_URL || 'http://localhost:5000';

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
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runPhase17bTests() {
  console.log('\n================================================================');
  console.log('🚀 PHASE 17B — REAL-WORLD PLACE & PHOTO DATA FOUNDATION SUITE');
  console.log('================================================================\n');

  // =========================================================================
  // 1. LOCATION SAFETY & DEMO ISOLATION
  // =========================================================================
  await test('Location Safety: Tirupati discovery NEVER returns Hyderabad demo places', async () => {
    // Tirupati coordinates: 13.6288, 79.4192
    const res = await fetch(`${BASE_URL}/api/places/nearby?lat=13.6288&lon=79.4192&radius=10000`);
    assert.strictEqual(res.status, 200, 'Nearby API must respond with 200');
    const data = await res.json();
    assert.ok(data.success, 'Response must be success');
    assert.ok(Array.isArray(data.places), 'Places must be an array');
    assert.ok(data.places.length > 0, 'Tirupati must return places');

    // Verify ZERO Hyderabad demo places in Tirupati results
    const hasCharminar = data.places.some(p => p.id === 'charminar' || p.name.toLowerCase().includes('charminar'));
    const hasGolconda = data.places.some(p => p.id === 'golconda' || p.name.toLowerCase().includes('golconda'));
    const hasNiloufer = data.places.some(p => p.name.toLowerCase().includes('niloufer'));

    assert.strictEqual(hasCharminar, false, 'Must NOT contain Charminar in Tirupati');
    assert.strictEqual(hasGolconda, false, 'Must NOT contain Golconda in Tirupati');
    assert.strictEqual(hasNiloufer, false, 'Must NOT contain Niloufer in Tirupati');

    // Verify genuine Tirupati places are returned
    const hasTirupatiPlace = data.places.some(p => 
      p.name.includes('Venkateswara') || 
      p.name.includes('Chandragiri') || 
      p.name.includes('Kapila') ||
      p.city === 'Tirupati'
    );
    assert.ok(hasTirupatiPlace, 'Must contain authentic Tirupati landmarks');
  });

  await test('Location Safety: Rajahmundry discovery NEVER returns Hyderabad demo places', async () => {
    // Rajahmundry coordinates: 17.0005, 81.8040
    const res = await fetch(`${BASE_URL}/api/places/nearby?lat=17.0005&lon=81.8040&radius=12000`);
    assert.strictEqual(res.status, 200, 'Nearby API must respond with 200');
    const data = await res.json();
    assert.ok(data.success, 'Response must be success');
    assert.ok(Array.isArray(data.places), 'Places must be an array');
    assert.ok(data.places.length > 0, 'Rajahmundry must return places');

    // Verify ZERO Hyderabad demo places in Rajahmundry
    const hasCharminar = data.places.some(p => p.id === 'charminar' || p.name.toLowerCase().includes('charminar'));
    assert.strictEqual(hasCharminar, false, 'Must NOT contain Charminar in Rajahmundry');

    // Verify genuine Rajahmundry landmarks
    const hasGodavariPlace = data.places.some(p => 
      p.name.includes('Godavari') || 
      p.name.includes('Kotilingeshwara') ||
      p.name.includes('ISKCON') ||
      p.city === 'Rajahmundry'
    );
    assert.ok(hasGodavariPlace, 'Must contain authentic Godavari/Rajahmundry landmarks');
  });

  await test('Location Safety: Remote non-hub coordinates returns honest empty state, NEVER fake demo places', async () => {
    // Remote desert coordinates in Rajasthan without POIs: 27.5, 71.0
    const res = await fetch(`${BASE_URL}/api/places/nearby?lat=27.5&lon=71.0&radius=3000`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    assert.strictEqual(data.places.length, 0, 'Remote location must return 0 places');
    assert.strictEqual(data.source, 'none', 'Source must be "none" when no verified POIs found');
  });

  // =========================================================================
  // 2. DATA PROVENANCE & CONFIDENCE
  // =========================================================================
  await test('Data Provenance: Curated places return provenance="curated" and confidence="HIGH"', async () => {
    const res = await fetch(`${BASE_URL}/api/places/nearby?lat=13.6288&lon=79.4192&radius=15000`);
    const data = await res.json();
    const curatedPlace = data.places.find(p => p.provenance === 'curated');
    assert.ok(curatedPlace, 'Must contain at least one curated place');
    assert.strictEqual(curatedPlace.confidence, 'HIGH', 'Curated place confidence must be HIGH');
    assert.strictEqual(curatedPlace.verified, true, 'Curated place must be verified: true');
    assert.ok(curatedPlace.shortDescription, 'Curated place must have verified description');
  });

  // =========================================================================
  // 3. PHOTO VERIFICATION & ATTRIBUTION
  // =========================================================================
  await test('Photo Verification: Landmark lookup returns authentic URL and CC attribution metadata', async () => {
    const res = await fetch(`${BASE_URL}/api/places/photo?name=Chandragiri%20Fort&lat=13.5833&lon=79.3167`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    assert.ok(data.hasPhoto, 'Chandragiri Fort must have verified photo');
    assert.ok(data.imageUrl.includes('wikimedia.org'), 'Must be Wikimedia Commons URL');
    assert.ok(data.photo, 'Must have structured photo metadata');
    assert.ok(data.photo.attribution.includes('Wikimedia Commons'), 'Must include Wikimedia attribution');
    assert.strictEqual(data.photo.verifiedForPlace, true, 'verifiedForPlace must be true');
  });

  await test('Photo Verification: Obscure or unverified place returns null, NEVER random stock image', async () => {
    const res = await fetch(`${BASE_URL}/api/places/photo?name=Sharma%20Kirana%20Small%20General%20Store`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.hasPhoto, false, 'Obscure store must NOT have verified photo');
    assert.strictEqual(data.imageUrl, null, 'imageUrl must be null');
  });

  // =========================================================================
  // 4. FOOD DISCOVERY & ZERO STOCK PHOTOS
  // =========================================================================
  await test('Food Explorer: Live dining places do NOT contain generic Unsplash stock photos', async () => {
    const res = await fetch(`${BASE_URL}/api/places/food?lat=13.6288&lon=79.4192&radius=5000`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);

    if (data.places.length > 0) {
      for (const p of data.places) {
        if (p.source === 'live') {
          assert.ok(
            !p.imageUrl.includes('unsplash.com'),
            `Live dining place "${p.name}" must NOT have generic Unsplash stock image`
          );
        }
      }
    }
  });

  await test('Food Explorer: Remote location with no dining returns clean 0 results, NEVER Hyderabad fallback', async () => {
    // Remote desert coordinates
    const res = await fetch(`${BASE_URL}/api/places/food?lat=27.5&lon=71.0&radius=3000`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    assert.strictEqual(data.places.length, 0, 'Remote location must return 0 food places');
  });

  // =========================================================================
  // 5. RECOMMENDATIONS ENGINE DESTINATION CONSISTENCY
  // =========================================================================
  await test('Recommendations: Requesting recommendations for Tirupati coordinates does NOT inject Hyderabad places', async () => {
    const res = await fetch(`${BASE_URL}/api/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userLat: 13.6288,
        userLon: 79.4192,
        preferences: {
          interests: ['temples', 'history'],
          availableHours: 4,
          budgetAmount: 1000,
          travelStyle: 'solo'
        }
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    const recPlaces = data.places || data.recommendations;
    assert.ok(Array.isArray(recPlaces), 'Must return places array');

    if (recPlaces.length > 0) {
      // Must NOT contain Charminar or Golconda
      const hasCharminar = recPlaces.some(p => p.id === 'charminar' || p.name === 'Charminar');
      assert.strictEqual(hasCharminar, false, 'Tirupati recommendations must NOT include Charminar');

      // Distances must be within reasonable regional proximity (< 45 km)
      for (const rec of recPlaces) {
        assert.ok(rec.distanceKm < 45, `Recommended place "${rec.name}" must be within 45km, was ${rec.distanceKm}km`);
      }
    }
  });

  // =========================================================================
  // 6. DEDUPLICATION
  // =========================================================================
  await test('Deduplication: Places at identical coordinates or matching name variants are unified', async () => {
    const { deduplicatePlaces } = await import('../../../server/dist/services/deduplicationService.js');

    const duplicates = [
      {
        id: 'osm-1',
        name: 'Sri Venkateswara Temple',
        category: 'temples',
        categoryLabel: '🛕 Temple',
        lat: 13.6833,
        lon: 79.3472,
        visitDuration: '2 hrs',
        imageUrl: '',
        shortDescription: 'OSM place',
        whyRecommended: '',
        tags: [],
        source: 'live',
        provenance: 'osm'
      },
      {
        id: 'curated-1',
        name: 'Sri Venkateswara Swamy Temple (Tirumala)',
        category: 'temples',
        categoryLabel: '🛕 Temple',
        lat: 13.6835, // ~22m away
        lon: 79.3473,
        visitDuration: '2 hrs',
        imageUrl: 'https://upload.wikimedia.org/test.jpg',
        shortDescription: 'Curated verified place',
        whyRecommended: '',
        tags: [],
        source: 'curated',
        provenance: 'curated',
        confidence: 'HIGH',
        verified: true
      }
    ];

    const unified = deduplicatePlaces(duplicates);
    assert.strictEqual(unified.length, 1, 'Duplicate places within 50m must be deduplicated into 1 record');
    assert.strictEqual(unified[0].provenance, 'curated', 'Must prefer the curated record over the raw OSM record');
    assert.ok(unified[0].imageUrl.includes('wikimedia'), 'Must retain the verified photo');
  });

  console.log('\n================================================================');
  console.log(`PHASE 17B SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase17bTests();
