// Phase 8.1 Distance & Routing Automated Test Runner

const EARTH_RADIUS_KM = 6371.0;

function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;
  return Math.round(distance * 100) / 100;
}

function optimizeRouteNearestNeighbor(origin, stops) {
  if (stops.length <= 1) return { orderedStops: stops, beforeKm: 0, afterKm: 0, savedKm: 0 };

  let beforeDistance = 0;
  let curLat = origin.lat;
  let curLon = origin.lon;
  for (const s of stops) {
    beforeDistance += calculateHaversineDistanceKm(curLat, curLon, s.lat, s.lon);
    curLat = s.lat;
    curLon = s.lon;
  }

  const unvisited = [...stops];
  const orderedStops = [];
  curLat = origin.lat;
  curLon = origin.lon;

  while (unvisited.length > 0) {
    let closestIndex = 0;
    let minDistance = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const d = calculateHaversineDistanceKm(curLat, curLon, unvisited[i].lat, unvisited[i].lon);
      if (d < minDistance) {
        minDistance = d;
        closestIndex = i;
      }
    }
    const nextStop = unvisited.splice(closestIndex, 1)[0];
    orderedStops.push(nextStop);
    curLat = nextStop.lat;
    curLon = nextStop.lon;
  }

  let afterDistance = 0;
  curLat = origin.lat;
  curLon = origin.lon;
  for (const s of orderedStops) {
    afterDistance += calculateHaversineDistanceKm(curLat, curLon, s.lat, s.lon);
    curLat = s.lat;
    curLon = s.lon;
  }

  const savedKm = Math.max(0, beforeDistance - afterDistance);
  return {
    orderedStops,
    beforeKm: Math.round(beforeDistance * 10) / 10,
    afterKm: Math.round(afterDistance * 10) / 10,
    savedKm: Math.round(savedKm * 10) / 10
  };
}

async function run() {
  console.log('====================================================');
  console.log('PHASE 8.1 DISTANCE & ROUTING VERIFICATION TEST');
  console.log('====================================================\n');

  // Test 1: Haversine Point-to-Point Distances
  console.log('>>> 1. POINT-TO-POINT HAVERSINE DISTANCE VERIFICATION');
  const places = {
    origin: { name: 'User Location (Abids/Koti)', lat: 17.3850, lon: 78.4867 },
    charminar: { name: 'Charminar', lat: 17.3616, lon: 78.4747 },
    laadBazaar: { name: 'Laad Bazaar', lat: 17.3610, lon: 78.4735 },
    chowmahalla: { name: 'Chowmahalla Palace', lat: 17.3578, lon: 78.4717 },
    golconda: { name: 'Golconda Fort', lat: 17.3833, lon: 78.4011 },
    birlaMandir: { name: 'Birla Mandir', lat: 17.4062, lon: 78.4691 }
  };

  const d1 = calculateHaversineDistanceKm(places.origin.lat, places.origin.lon, places.charminar.lat, places.charminar.lon);
  const d2 = calculateHaversineDistanceKm(places.charminar.lat, places.charminar.lon, places.laadBazaar.lat, places.laadBazaar.lon);
  const d3 = calculateHaversineDistanceKm(places.laadBazaar.lat, places.laadBazaar.lon, places.chowmahalla.lat, places.chowmahalla.lon);
  const d4 = calculateHaversineDistanceKm(places.charminar.lat, places.charminar.lon, places.golconda.lat, places.golconda.lon);

  console.log(`  • Origin -> Charminar: ${d1} km (Expected ~2.9 km)`);
  console.log(`  • Charminar -> Laad Bazaar: ${d2} km (${Math.round(d2*1000)} m) (Expected ~150 m)`);
  console.log(`  • Laad Bazaar -> Chowmahalla: ${d3} km (${Math.round(d3*1000)} m) (Expected ~400 m)`);
  console.log(`  • Charminar -> Golconda Fort: ${d4} km (Expected ~8.5 km)\n`);

  // Test 2: Multi-Stop Itinerary with Backtracking vs Optimization
  console.log('>>> 2. MULTI-STOP ROUTE OPTIMIZATION TEST');
  console.log('  Scenario: User selects 4 stops in arbitrary / backtracking order:');
  console.log('  [Charminar, Golconda Fort, Laad Bazaar, Chowmahalla Palace]\n');

  const unoptimizedStops = [places.charminar, places.golconda, places.laadBazaar, places.chowmahalla];
  const optResult = optimizeRouteNearestNeighbor(places.origin, unoptimizedStops);

  console.log('  UNOPTIMIZED ROUTE:');
  console.log(`    Start: ${places.origin.name}`);
  let cur = places.origin;
  unoptimizedStops.forEach((s, idx) => {
    const legDist = calculateHaversineDistanceKm(cur.lat, cur.lon, s.lat, s.lon);
    console.log(`      ↓ Leg ${idx + 1}: ${legDist} km`);
    console.log(`      Stop ${idx + 1}: ${s.name}`);
    cur = s;
  });
  console.log(`    TOTAL UNOPTIMIZED DISTANCE: ${optResult.beforeKm} km\n`);

  console.log('  OPTIMIZED ROUTE (Nearest-Neighbor Heuristic):');
  console.log(`    Start: ${places.origin.name}`);
  cur = places.origin;
  optResult.orderedStops.forEach((s, idx) => {
    const legDist = calculateHaversineDistanceKm(cur.lat, cur.lon, s.lat, s.lon);
    console.log(`      ↓ Leg ${idx + 1}: ${legDist} km`);
    console.log(`      Stop ${idx + 1}: ${s.name}`);
    cur = s;
  });
  console.log(`    TOTAL OPTIMIZED DISTANCE: ${optResult.afterKm} km`);
  console.log(`    🏆 DISTANCE SAVED: ${optResult.savedKm} km (${Math.round((optResult.savedKm / optResult.beforeKm) * 100)}% reduction in travel!)\n`);

  // Test 3: Regression Test for Phase 7
  console.log('>>> 3. REGRESSION CHECK: VERIFY PHASE 7 ENGINE HEALTH');
  try {
    const res = await fetch('http://localhost:5000/api/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userLat: 17.3850,
        userLon: 78.4867,
        preferences: {
          interests: ['food'],
          availableTime: 'short',
          budgetAmount: 500,
          travelStyle: 'solo',
          pacePreference: 'packed'
        }
      })
    });
    const data = await res.json();
    if (data.success && data.places.length > 0) {
      console.log(`  ✓ Phase 7 API Responded: ${data.places.length} places returned`);
      console.log(`  ✓ Top Result: ${data.places[0].name} (${data.places[0].category}) with score ${data.places[0].matchScore}%`);
      console.log(`  ✓ Why Matched: ${data.places[0].matchReasons[0]}`);
    } else {
      console.error('  ✗ Phase 7 API returned unexpected payload');
    }
  } catch (err) {
    console.error('  ✗ Phase 7 API call failed:', err.message);
  }
}

run();
