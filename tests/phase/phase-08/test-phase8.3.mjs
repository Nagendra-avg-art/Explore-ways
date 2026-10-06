// Phase 8.3 Real Road Routing Automated Test Suite
const BASE_URL = 'http://localhost:5000/api';

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('     PHASE 8.3 — REAL ROAD ROUTING VERIFICATION SUITE           ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(desc, condition, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      if (details) console.error(`     Reason: ${details}`);
      failed++;
    }
  }

  // TEST 1: Single-leg Road Routing from Charminar to Golconda Fort
  console.log('--- TEST 1: Single-Leg Real Road Routing ---');
  try {
    const origin = { lat: 17.3616, lon: 78.4747 }; // Charminar
    const dest = { lat: 17.3833, lon: 78.4011 }; // Golconda Fort
    const straightDist = calculateHaversineKm(origin.lat, origin.lon, dest.lat, dest.lon);

    const waypointsParam = `${origin.lat},${origin.lon};${dest.lat},${dest.lon}`;
    const t0 = Date.now();
    const res = await fetch(`${BASE_URL}/routes/directions?waypoints=${waypointsParam}&mode=cab`);
    const data = await res.json();
    const timeTaken = Date.now() - t0;

    assert('Response status is success', data.success === true, JSON.stringify(data));
    assert('Source is OSRM road network', data.source === 'osrm', `Got ${data.source}`);
    assert('Coordinates array has dense street geometry (> 100 points)', Array.isArray(data.coordinates) && data.coordinates.length > 100, `Got ${data.coordinates?.length} points`);
    
    // Check Leaflet coordinates order [lat, lon]
    const firstCoord = data.coordinates[0];
    assert('Coordinates are correctly mapped to Leaflet format [lat, lon]', Math.abs(firstCoord[0] - origin.lat) < 0.05 && Math.abs(firstCoord[1] - origin.lon) < 0.05, `Got [${firstCoord}] vs [${origin.lat}, ${origin.lon}]`);

    // Road distance should be greater than straight-line distance
    assert(
      `Road distance (${data.totalDistanceKm} km) is realistically longer than direct Haversine (${straightDist.toFixed(2)} km)`,
      data.totalDistanceKm > straightDist && data.totalDistanceKm < straightDist * 2.0,
      `Road: ${data.totalDistanceKm} km, Straight: ${straightDist.toFixed(2)} km`
    );

    assert('Travel duration is positive', data.totalDurationMin > 0, `Duration: ${data.totalDurationMin}`);
    assert('Legs array contains 1 leg', data.legs && data.legs.length === 1);
    assert('Leg has turn-by-turn maneuvers', data.legs[0].maneuvers && data.legs[0].maneuvers.length > 0, `Steps count: ${data.legs[0]?.maneuvers?.length}`);

    console.log(`     Points: ${data.coordinates.length} vertices`);
    console.log(`     Road Distance: ${data.totalDistanceKm} km (vs Straight-Line: ${straightDist.toFixed(2)} km)`);
    console.log(`     Estimated Time: ${data.totalDurationMin} min`);
    console.log(`     Turn Maneuvers: ${data.legs[0].maneuvers.length} steps`);
    console.log(`     First step: "${data.legs[0].maneuvers[0]?.instruction}"`);
  } catch (err) {
    assert('Single leg route failed with exception', false, err.message);
  }

  // TEST 2: Multi-Stop Itinerary Routing (Origin -> Stop 1 -> Stop 2 -> Stop 3)
  console.log('\n--- TEST 2: Multi-Stop Itinerary Road Routing ---');
  try {
    const stops = [
      { name: 'Charminar (Origin)', lat: 17.3616, lon: 78.4747 },
      { name: 'Salar Jung Museum', lat: 17.3713, lon: 78.4804 },
      { name: 'Birla Mandir', lat: 17.4062, lon: 78.4691 },
      { name: 'Golconda Fort', lat: 17.3833, lon: 78.4011 },
    ];
    const waypointsParam = stops.map(s => `${s.lat},${s.lon}`).join(';');

    const res = await fetch(`${BASE_URL}/routes/directions?waypoints=${waypointsParam}&mode=cab`);
    const data = await res.json();

    assert('Multi-stop query returns success', data.success === true);
    assert('Multi-stop returns 3 legs (N-1 legs for 4 waypoints)', data.legs && data.legs.length === 3, `Got ${data.legs?.length} legs`);
    assert('Overall coordinates array contains full continuous street geometry (> 250 points)', data.coordinates.length > 250, `Got ${data.coordinates.length} points`);
    
    // Validate each leg
    for (let i = 0; i < data.legs.length; i++) {
      const leg = data.legs[i];
      assert(`Leg ${i + 1} (${stops[i].name} → ${stops[i+1].name}) has road distance and duration`, leg.distanceKm > 0 && leg.durationMin > 0);
      assert(`Leg ${i + 1} has turn maneuvers`, Array.isArray(leg.maneuvers) && leg.maneuvers.length > 0);
    }

    console.log(`     Total Road Itinerary: ${data.totalDistanceKm} km across ${data.coordinates.length} coordinates`);
    console.log(`     Total Duration: ${data.totalDurationMin} min`);
  } catch (err) {
    assert('Multi-stop routing failed with exception', false, err.message);
  }

  // TEST 3: High-Performance In-Memory Cache Verification
  console.log('\n--- TEST 3: In-Memory LRU Route Cache Verification ---');
  try {
    const waypointsParam = `17.3616,78.4747;17.3833,78.4011`;
    const t0 = Date.now();
    const resCached = await fetch(`${BASE_URL}/routes/directions?waypoints=${waypointsParam}&mode=cab`);
    const cachedData = await resCached.json();
    const cacheResponseTime = Date.now() - t0;

    assert('Cached route returns success', cachedData.success === true);
    assert('Cached route response is ultra-fast (< 50ms)', cacheResponseTime < 50, `Response time: ${cacheResponseTime}ms`);
    console.log(`     Cached fetch latency: ${cacheResponseTime}ms`);
  } catch (err) {
    assert('Cache verification failed', false, err.message);
  }

  // TEST 4: Resilient Fallback Graceful Handling
  console.log('\n--- TEST 4: Resilient Urban Heuristic Fallback ---');
  try {
    // Malformed/unroutable coordinate in the middle of the Indian Ocean
    const waypointsParam = `0.0001,0.0001;0.0500,0.0500`;
    const res = await fetch(`${BASE_URL}/routes/directions?waypoints=${waypointsParam}&mode=cab`);
    const data = await res.json();

    assert('Unroutable query returns gracefully without crash (200 OK or handled fallback)', data.success === true);
    assert('Source correctly notes fallback or osrm', Boolean(data.source));
    assert('Fallback provides estimated distance and 2-point coordinates', data.coordinates.length >= 2);
    console.log(`     Handled result source: ${data.source}, distance: ${data.totalDistanceKm} km`);
  } catch (err) {
    assert('Fallback verification failed', false, err.message);
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
