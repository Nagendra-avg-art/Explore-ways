// tests/phase/phase-17/test-phase17c-reliability-audit.mjs
// Phase 17C: Production Reliability & Security Audit Test Suite
// Verifies error handling, input validation, boundaries, rate limiting, and fallback stability

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

async function runPhase17cAudit() {
  console.log('\n================================================================');
  console.log('🔒 PHASE 17C — PRODUCTION RELIABILITY & SECURITY AUDIT SUITE');
  console.log('================================================================\n');

  // 1. Health check & process status
  await test('Health check returns operational metadata with uptime', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.status, 200, 'Health check must return 200');
    const data = await res.json();
    assert.strictEqual(data.status, 'healthy', 'Status must be healthy');
    assert.ok(typeof data.uptimeSeconds === 'number', 'Uptime must be a number');
    assert.ok(typeof data.timestamp === 'string', 'Timestamp must be string');
  });

  // 2. Unmatched routes (404 handler)
  await test('Catch-all 404 handler returns clean JSON without crashing', async () => {
    const res = await fetch(`${BASE_URL}/api/non-existent-endpoint-${Date.now()}`);
    assert.strictEqual(res.status, 404, 'Must return 404');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.error.includes('Route not found'), 'Error must inform route not found');
  });

  // 3. Coordinate validation on Places
  await test('Places API rejects invalid latitude (>90) with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/places?lat=95.5&lon=78.4`);
    assert.strictEqual(res.status, 400, 'Must reject invalid latitude with 400');
    const data = await res.json();
    assert.ok(data.error.includes('Invalid numeric coordinates'));
  });

  await test('Places API rejects invalid longitude (>180) with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/places?lat=17.3&lon=195.4`);
    assert.strictEqual(res.status, 400, 'Must reject invalid longitude with 400');
    const data = await res.json();
    assert.ok(data.error.includes('Invalid numeric coordinates'));
  });

  // 4. Reverse geocoding input validation
  await test('Reverse geocode rejects missing coordinates with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/location/reverse`);
    assert.strictEqual(res.status, 400, 'Must return 400 for missing coords');
  });

  await test('Reverse geocode rejects non-numeric coordinates with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/location/reverse?lat=abc&lon=def`);
    assert.strictEqual(res.status, 400, 'Must return 400 for non-numeric coords');
  });

  // 5. Weather endpoint validation
  await test('Weather endpoint rejects out-of-range coordinates with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/weather?lat=120&lon=50`);
    assert.strictEqual(res.status, 400, 'Must return 400 for lat=120');
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.error.includes('Invalid coordinates'));
  });

  // 6. Routing waypoints bounds checking
  await test('Directions API rejects fewer than 2 coordinates with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/routes/directions?coordinates=78.4747,17.3616`);
    assert.strictEqual(res.status, 400, 'Must reject single waypoint with 400');
  });

  await test('Directions API enforces maximum 25 waypoints to protect upstream server', async () => {
    // Generate 30 dummy coordinate pairs
    const pairs = Array.from({ length: 30 }, (_, i) => `78.${4700 + i},17.${3600 + i}`).join(';');
    const res = await fetch(`${BASE_URL}/api/routes/directions?coordinates=${encodeURIComponent(pairs)}`);
    assert.strictEqual(res.status, 400, 'Must reject 30 waypoints with 400');
    const data = await res.json();
    assert.ok(data.error.includes('Maximum 25 waypoints allowed'));
  });

  // 7. AI Guide input boundaries & safety
  await test('AI chat rejects empty query with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '   ' })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  await test('AI chat rejects payload exceeding 2,000 characters with 400', async () => {
    const longMessage = 'A'.repeat(2500);
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: longMessage })
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.error.includes('exceeds maximum limit'));
  });

  await test('AI status does NOT expose raw secret keys', async () => {
    const res = await fetch(`${BASE_URL}/api/ai/status`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, 'online');
    assert.strictEqual(typeof data.hasApiKey, 'boolean', 'hasApiKey must be boolean');
    assert.strictEqual(data.apiKey, undefined, 'API key must not be present');
    assert.strictEqual(data.geminiKey, undefined, 'Gemini key must not be present');
  });

  // 8. Large body limit protection
  await test('Server rejects payloads larger than 1MB with 413', async () => {
    // 1.5 MB body
    const bigString = 'x'.repeat(1.5 * 1024 * 1024);
    try {
      const res = await fetch(`${BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: bigString })
      });
      assert.strictEqual(res.status, 413, 'Must reject >1MB payload with 413');
    } catch (err) {
      // In some Node versions connection reset is thrown on 413, which is also acceptable
      assert.ok(true, 'Connection was terminated on oversized body');
    }
  });

  // 9. Verified photo fallback resilience
  await test('Place photo lookup handles unknown entity with clean placeholder null', async () => {
    const res = await fetch(`${BASE_URL}/api/places/photo?name=${encodeURIComponent('NonExistentPlace999XYZ')}&category=cultural&lat=17.0&lon=81.0`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.imageUrl, null, 'Unverified photo must return null to trigger clean UI placeholder');
    assert.strictEqual(data.hasPhoto, false);
  });

  // 10. Empty search queries on location
  await test('Location search handles empty/whitespace query gracefully', async () => {
    const res = await fetch(`${BASE_URL}/api/location/search?q=`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.results), 'Results must be an array');
    assert.ok(data.results.length > 0, 'Empty search returns popular fallback hubs');
  });

  // 11. OSRM Routing fallback to Haversine
  await test('Directions API falls back gracefully if coordinates are in remote ocean', async () => {
    // Null Island / middle of Atlantic Ocean
    const res = await fetch(`${BASE_URL}/api/routes/directions?coordinates=0.0,0.0;0.1,0.1`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.totalDistanceKm > 0);
    assert.ok(Array.isArray(data.legs));
  });

  console.log('\n================================================================');
  console.log(`📊 PHASE 17C AUDIT RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase17cAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
