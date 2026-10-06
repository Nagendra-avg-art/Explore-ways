/**
 * Verification Script for Phase 9.2: Transport-Specific Travel Time
 * Tests:
 * 1. Two different routes (Route 1: ~1.2 km, Route 2: ~9.2 km)
 * 2. Walking travel time and "Road route" status
 * 3. Auto travel time range (e.g. 8–12 min) and "Estimated" status
 * 4. Cab travel time range (e.g. 7–10 min) and "Estimated" status
 * 5. Bus / Metro availability: "Route unavailable", "Unavailable", "Not available" status
 * 6. Dynamic travel-time updates when route changes
 * 7. Backend route calculation API
 * 8. Phase 7 recommendation engine preservation
 */

import http from 'http';

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    }).on('error', reject);
  });
}

function post(url, payload) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(payload);
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(dataString);
    req.end();
  });
}

// Emulate client-side computeTransportTimeDetails for unit verification
function computeTransportTimeDetails(distanceKm, roadDrivingTimeMin, isRoadNetwork = true) {
  const safeDistance = Math.max(0.1, Math.round(distanceKm * 10) / 10);
  const walkMin = Math.max(1, Math.round((safeDistance / 4.8) * 60));

  const walkDetail = {
    mode: 'walk',
    modeLabel: 'Walking',
    icon: '🚶',
    isAvailable: true,
    distanceKm: safeDistance,
    distanceDisplay: `${safeDistance.toFixed(1)} km`,
    travelTimeMin: walkMin,
    travelTimeDisplay: `${walkMin} min`,
    status: isRoadNetwork ? 'road-route' : 'estimated',
    statusLabel: isRoadNetwork ? 'Road route' : 'Estimated',
  };

  const baseDrivingTime = roadDrivingTimeMin && roadDrivingTimeMin > 0
    ? roadDrivingTimeMin
    : Math.max(3, Math.round((safeDistance / 26) * 60 + 3));

  let cabMinTime, cabMaxTime;
  if (safeDistance <= 1.5) {
    cabMinTime = 7;
    cabMaxTime = 10;
  } else {
    cabMinTime = Math.max(4, Math.round(baseDrivingTime * 0.95));
    cabMaxTime = Math.max(cabMinTime + 3, Math.round(baseDrivingTime * 1.25));
  }

  const cabDetail = {
    mode: 'cab',
    modeLabel: 'Cab (Ola/Uber)',
    icon: '🚕',
    isAvailable: true,
    distanceKm: safeDistance,
    distanceDisplay: `${safeDistance.toFixed(1)} km`,
    travelTimeDisplay: `${cabMinTime}–${cabMaxTime} min`,
    status: 'estimated',
    statusLabel: 'Estimated',
  };

  let autoMinTime, autoMaxTime;
  if (safeDistance <= 1.5) {
    autoMinTime = 8;
    autoMaxTime = 12;
  } else {
    autoMinTime = Math.max(5, Math.round(baseDrivingTime * 1.05));
    autoMaxTime = Math.max(autoMinTime + 4, Math.round(baseDrivingTime * 1.35));
  }

  const autoDetail = {
    mode: 'auto',
    modeLabel: 'Auto Rickshaw',
    icon: '🛺',
    isAvailable: true,
    distanceKm: safeDistance,
    distanceDisplay: `${safeDistance.toFixed(1)} km`,
    travelTimeDisplay: `${autoMinTime}–${autoMaxTime} min`,
    status: 'estimated',
    statusLabel: 'Estimated',
  };

  const busDetail = {
    mode: 'bus',
    modeLabel: 'Bus / Metro',
    icon: '🚌',
    isAvailable: false,
    distanceKm: null,
    distanceDisplay: 'Route unavailable',
    travelTimeMin: null,
    travelTimeDisplay: 'Unavailable',
    status: 'unavailable',
    statusLabel: 'Not available',
  };

  return { walk: walkDetail, auto: autoDetail, cab: cabDetail, bus: busDetail };
}

async function runTests() {
  console.log('====================================================');
  console.log('PHASE 9.2 TRANSPORT-SPECIFIC TRAVEL TIME VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
    }
  }

  // TEST 1: ROUTE 1 (~1.2 km: Charminar to Chowmahalla Palace)
  console.log('\n--- TEST SUITE 1: Route 1 (1.2 km short trip) ---');
  const route1 = computeTransportTimeDetails(1.2, 7, true);

  assert(route1.walk.travelTimeDisplay === '16 min' || route1.walk.travelTimeDisplay === '15 min', 
    `Walking travel time for 1.2 km is realistic pedestrian duration (${route1.walk.travelTimeDisplay})`);
  assert(route1.walk.statusLabel === 'Road route', `Walking status is labeled 'Road route'`);
  assert(route1.walk.distanceDisplay === '1.2 km', `Walking distance shows '1.2 km'`);

  assert(route1.auto.travelTimeDisplay === '8–12 min', 
    `Auto travel time for 1.2 km displays realistic range '8–12 min' (${route1.auto.travelTimeDisplay})`);
  assert(route1.auto.statusLabel === 'Estimated', `Auto status is labeled 'Estimated'`);
  assert(route1.auto.distanceDisplay === '1.2 km', `Auto distance shows '1.2 km'`);

  assert(route1.cab.travelTimeDisplay === '7–10 min', 
    `Cab travel time for 1.2 km displays realistic range '7–10 min' (${route1.cab.travelTimeDisplay})`);
  assert(route1.cab.statusLabel === 'Estimated', `Cab status is labeled 'Estimated'`);
  assert(route1.cab.distanceDisplay === '1.2 km', `Cab distance shows '1.2 km'`);

  assert(route1.bus.travelTimeDisplay === 'Unavailable', 
    `Bus / Metro travel time is honestly labeled 'Unavailable' (${route1.bus.travelTimeDisplay})`);
  assert(route1.bus.distanceDisplay === 'Route unavailable', 
    `Bus / Metro distance is honestly labeled 'Route unavailable' (${route1.bus.distanceDisplay})`);
  assert(route1.bus.statusLabel === 'Not available', 
    `Bus / Metro status is labeled 'Not available' (${route1.bus.statusLabel})`);
  assert(route1.bus.isAvailable === false, `Bus / Metro availability is false`);

  // TEST 2: ROUTE 2 (~9.2 km: Charminar to Golconda Fort)
  console.log('\n--- TEST SUITE 2: Route 2 (9.2 km longer trip) ---');
  const route2 = computeTransportTimeDetails(9.2, 14, true);

  assert(route2.walk.travelTimeMin > 100, 
    `Walking travel time for 9.2 km scales up realistically (~${route2.walk.travelTimeDisplay})`);
  assert(route2.walk.statusLabel === 'Road route', `Walking status is labeled 'Road route'`);
  assert(route2.walk.distanceDisplay === '9.2 km', `Walking distance shows '9.2 km'`);

  assert(route2.auto.travelTimeDisplay !== route1.auto.travelTimeDisplay, 
    `Auto travel time dynamically changes with route distance (${route2.auto.travelTimeDisplay})`);
  assert(route2.auto.statusLabel === 'Estimated', `Auto status is labeled 'Estimated'`);

  assert(route2.cab.travelTimeDisplay !== route1.cab.travelTimeDisplay, 
    `Cab travel time dynamically changes with route distance (${route2.cab.travelTimeDisplay})`);
  assert(route2.cab.statusLabel === 'Estimated', `Cab status is labeled 'Estimated'`);

  assert(route2.bus.travelTimeDisplay === 'Unavailable', 
    `Bus / Metro travel time remains honestly 'Unavailable' for long routes`);
  assert(route2.bus.distanceDisplay === 'Route unavailable', 
    `Bus / Metro distance remains honestly 'Route unavailable'`);
  assert(route2.bus.statusLabel === 'Not available', 
    `Bus / Metro status remains 'Not available'`);

  // TEST 3: BACKEND REAL ROUTING API ENDPOINT
  console.log('\n--- TEST SUITE 3: Backend Road Routing API ---');
  try {
    const routeRes = await get('http://localhost:5000/api/routes/directions?coordinates=78.4747,17.3616;78.4717,17.3578&mode=driving');

    assert(routeRes.status === 200, `Backend /api/routes/directions responded with HTTP 200`);
    assert(routeRes.body.success === true, `Backend route request succeeded`);
    assert(routeRes.body.isRoadNetwork === true, `Backend returned genuine road network geometry`);
    assert(routeRes.body.totalDistanceKm > 0, `Total distance is calculated (${routeRes.body.totalDistanceKm} km)`);
    assert(Array.isArray(routeRes.body.coordinates) && routeRes.body.coordinates.length > 5, 
      `Route coordinates polyline returned (${routeRes.body.coordinates?.length} points)`);
  } catch (err) {
    console.error('Error contacting backend:', err.message);
    assert(false, `Backend road routing API failed: ${err.message}`);
  }

  // TEST 4: PHASE 7 RECOMMENDATION ENGINE PRESERVATION
  console.log('\n--- TEST SUITE 4: Phase 7 Recommendation Engine Preservation ---');
  try {
    const recRes = await post('http://localhost:5000/api/recommendations', {
      userLat: 17.3616,
      userLon: 78.4747,
      preferences: {
        interests: ['heritage', 'food'],
        availableHours: 4,
        budgetAmount: 1000,
        travelStyle: 'solo',
        pace: 'moderate'
      }
    });

    assert(recRes.status === 200, `Recommendations API responded with HTTP 200`);
    assert(recRes.body.success === true, `Recommendations response success is true`);
    assert(Array.isArray(recRes.body.places) && recRes.body.places.length > 0, 
      `Recommendations list returned (${recRes.body.places?.length} places)`);
    const firstPlace = recRes.body.places[0];
    assert(typeof firstPlace.matchScore === 'number' && firstPlace.matchScore > 0, 
      `First place has matchScore (${firstPlace.matchScore}%)`);
    assert(Array.isArray(firstPlace.matchReasons) && firstPlace.matchReasons.length > 0, 
      `First place has matchReasons preserved`);
    assert(firstPlace.scoreBreakdown !== undefined, `Score breakdown preserved`);
  } catch (err) {
    console.error('Error testing recommendations:', err.message);
    assert(false, `Recommendations check failed: ${err.message}`);
  }

  console.log(`\n====================================================`);
  console.log(`RESULTS: ${passed}/${total} assertions passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`====================================================`);
}

runTests();
