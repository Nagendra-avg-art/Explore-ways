// Phase 9.3 Transport Fare Estimation Automated Verification Suite
import { 
  computeFareEstimates, 
  buildLegFareComparison, 
  computeTripFareSummary, 
  CENTRALIZED_FARE_CONFIG 
} from './client/src/services/fareEstimationService.ts';

const BASE_URL = 'http://localhost:5000/api';

async function runTestSuite() {
  console.log('================================================================');
  console.log('   PHASE 9.3 — TRANSPORT FARE ESTIMATION VERIFICATION SUITE     ');
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

  // TEST 1: Backend Health & Status
  console.log('--- TEST 1: Backend Health & Routing Status ---');
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    assert('Backend API is healthy', data.status === 'healthy');
  } catch (err) {
    assert('Backend connection failed', false, err.message);
  }

  // TEST 2: Centralized Config Check
  console.log('\n--- TEST 2: Centralized Fare Configuration & Data Honesty ---');
  assert('Centralized config has auto base fare ₹35', CENTRALIZED_FARE_CONFIG.auto.baseFare === 35);
  assert('Centralized config has cab base fare ₹75', CENTRALIZED_FARE_CONFIG.cab.baseFare === 75);
  assert('Centralized config auto assumptions disclaim live quotes', 
    CENTRALIZED_FARE_CONFIG.auto.assumptions.includes('Not a live booking quote'));
  assert('Centralized config cab assumptions exclude live surge and tolls', 
    CENTRALIZED_FARE_CONFIG.cab.assumptions.includes('Excludes live surge pricing'));
  assert('Centralized config bus assumptions note transit data not connected', 
    CENTRALIZED_FARE_CONFIG.bus.assumptions.includes('unavailable'));

  // TEST 3: Route 1 — Short City Route (Charminar to Golconda Fort, 10.2 km)
  console.log('\n--- TEST 3: Route 1 (Short City Route: 10.2 km) ---');
  const cityDistance = 10.2;
  const cityFares = computeFareEstimates(cityDistance);

  // 1. Walking shows Free
  assert('Route 1: Walking fare is Free', cityFares.walk.fareDisplay === 'Free');
  assert('Route 1: Walking min & max fare is ₹0', cityFares.walk.minFareInr === 0 && cityFares.walk.maxFareInr === 0);
  assert('Route 1: Walking isEstimate is false (exact zero)', cityFares.walk.isEstimate === false);

  // 2. Auto produces an estimated range
  assert('Route 1: Auto is marked as available estimate', cityFares.auto.isAvailable === true && cityFares.auto.isEstimate === true);
  assert('Route 1: Auto fare display has range and "estimated" label', 
    cityFares.auto.fareDisplay.includes('–') && cityFares.auto.fareDisplay.includes('estimated'));
  assert('Route 1: Auto min fare is reasonable (> ₹150 and < ₹250)', 
    cityFares.auto.minFareInr >= 150 && cityFares.auto.minFareInr <= 250);
  assert('Route 1: Auto max fare is higher than min fare', cityFares.auto.maxFareInr > cityFares.auto.minFareInr);

  // 3. Cab produces an estimated range
  assert('Route 1: Cab is marked as available estimate', cityFares.cab.isAvailable === true && cityFares.cab.isEstimate === true);
  assert('Route 1: Cab fare display has range and "estimated" label', 
    cityFares.cab.fareDisplay.includes('–') && cityFares.cab.fareDisplay.includes('estimated'));
  assert('Route 1: Cab min fare is reasonable (> ₹200 and < ₹320)', 
    cityFares.cab.minFareInr >= 200 && cityFares.cab.minFareInr <= 320);
  assert('Route 1: Cab max fare is higher than min fare', cityFares.cab.maxFareInr > cityFares.cab.minFareInr);

  // 4. Bus / Metro correctly shows unavailable
  assert('Route 1: Bus / Metro is marked as unavailable', cityFares.bus.isAvailable === false);
  assert('Route 1: Bus / Metro fare display says "Unavailable"', cityFares.bus.fareDisplay === 'Unavailable');

  console.log(`     Walk: ${cityFares.walk.fareDisplay}`);
  console.log(`     Auto: ${cityFares.auto.fareDisplay}`);
  console.log(`     Cab:  ${cityFares.cab.fareDisplay}`);
  console.log(`     Bus:  ${cityFares.bus.fareDisplay}`);

  // TEST 4: Route 2 — Long Multi-Stop Route (Tirupati -> Charminar -> Golconda Fort)
  console.log('\n--- TEST 4: Route 2 (Multi-Stop Route: Tirupati → Charminar → Golconda Fort) ---');
  const legs = [
    { fromName: 'Tirupati', toName: 'Charminar', distanceKm: 551.4 },
    { fromName: 'Charminar', toName: 'Golconda Fort', distanceKm: 10.2 }
  ];

  // 7. Multi-stop route calculates fare PER LEG
  const leg1Fares = computeFareEstimates(legs[0].distanceKm);
  const leg2Fares = computeFareEstimates(legs[1].distanceKm);

  assert('Leg 1 (Tirupati → Charminar, 551.4 km) Auto fare is non-zero range', 
    leg1Fares.auto.minFareInr > 6000 && leg1Fares.auto.maxFareInr > leg1Fares.auto.minFareInr);
  assert('Leg 2 (Charminar → Golconda Fort, 10.2 km) Auto fare is city range', 
    leg2Fares.auto.minFareInr >= 150 && leg2Fares.auto.maxFareInr <= 260);

  // 8. Total fare is strictly derived from sum of route legs
  const autoTripSummary = computeTripFareSummary(legs, 'auto');
  const expectedAutoMin = leg1Fares.auto.minFareInr + leg2Fares.auto.minFareInr;
  const expectedAutoMax = leg1Fares.auto.maxFareInr + leg2Fares.auto.maxFareInr;

  assert('Auto Trip Total min is exactly sum of Leg 1 min + Leg 2 min', 
    autoTripSummary.totalMinFareInr === expectedAutoMin);
  assert('Auto Trip Total max is exactly sum of Leg 1 max + Leg 2 max', 
    autoTripSummary.totalMaxFareInr === expectedAutoMax);
  assert('Auto Trip Total summary has 2 distinct leg breakdowns', 
    autoTripSummary.legs.length === 2);
  assert('Auto Trip Total display contains formatted sum', 
    autoTripSummary.totalFareDisplay.includes(`₹${expectedAutoMin.toLocaleString('en-IN')}–₹${expectedAutoMax.toLocaleString('en-IN')}`));

  // Cab Multi-Stop Sum
  const cabTripSummary = computeTripFareSummary(legs, 'cab');
  const expectedCabMin = leg1Fares.cab.minFareInr + leg2Fares.cab.minFareInr;
  const expectedCabMax = leg1Fares.cab.maxFareInr + leg2Fares.cab.maxFareInr;

  assert('Cab Trip Total min is exactly sum of Leg 1 min + Leg 2 min', 
    cabTripSummary.totalMinFareInr === expectedCabMin);
  assert('Cab Trip Total max is exactly sum of Leg 1 max + Leg 2 max', 
    cabTripSummary.totalMaxFareInr === expectedCabMax);

  // Walking Multi-Stop Sum
  const walkTripSummary = computeTripFareSummary(legs, 'walk');
  assert('Walking Trip Total is Free (₹0)', walkTripSummary.totalFareDisplay === 'Free (₹0)' && walkTripSummary.totalMinFareInr === 0);

  // Bus Multi-Stop Sum
  const busTripSummary = computeTripFareSummary(legs, 'bus');
  assert('Bus Trip Total is Unavailable', busTripSummary.totalFareDisplay === 'Unavailable');

  console.log(`     Leg 1 (551.4 km) Auto: ${leg1Fares.auto.fareDisplay}`);
  console.log(`     Leg 2 (10.2 km)  Auto: ${leg2Fares.auto.fareDisplay}`);
  console.log(`     Trip Total Auto:       ${autoTripSummary.totalFareDisplay}`);
  console.log(`     Trip Total Cab:        ${cabTripSummary.totalFareDisplay}`);
  console.log(`     Trip Total Walk:       ${walkTripSummary.totalFareDisplay}`);
  console.log(`     Trip Total Bus:        ${busTripSummary.totalFareDisplay}`);

  // TEST 5: Changing Transport Mode Updates Fare
  console.log('\n--- TEST 5: Transport Mode Selection Updates Fare Dynamically ---');
  assert('Mode auto != cab total fare', autoTripSummary.totalFareDisplay !== cabTripSummary.totalFareDisplay);
  assert('Mode walk is free while cab is paid', walkTripSummary.totalMinFareInr === 0 && cabTripSummary.totalMinFareInr > 0);
  assert('Mode bus is unavailable while auto is available', busTripSummary.totalFareDisplay === 'Unavailable' && autoTripSummary.isEstimate === true);

  // TEST 6: Changing Route Distance Changes Fare
  console.log('\n--- TEST 6: Changing Route Changes Fare ---');
  const shortFare = computeFareEstimates(3.5);
  const longFare = computeFareEstimates(25.0);
  assert('Longer distance (25km) produces higher auto fare than short (3.5km)', 
    longFare.auto.minFareInr > shortFare.auto.minFareInr);
  assert('Longer distance (25km) produces higher cab fare than short (3.5km)', 
    longFare.cab.minFareInr > shortFare.cab.minFareInr);

  // TEST 7: Data Honesty Check
  console.log('\n--- TEST 7: Data Honesty & Transparency Checks ---');
  const allDisplays = [
    cityFares.walk.fareDisplay,
    cityFares.auto.fareDisplay,
    cityFares.cab.fareDisplay,
    cityFares.bus.fareDisplay,
    autoTripSummary.totalFareDisplay,
    cabTripSummary.totalFareDisplay,
  ];

  const forbiddenTerms = ['live fare', 'exact fare', 'current ola/uber price', 'uber quote', 'ola quote'];
  let foundForbidden = false;
  for (const display of allDisplays) {
    for (const term of forbiddenTerms) {
      if (display.toLowerCase().includes(term)) {
        foundForbidden = true;
        console.error(`Forbidden term found in display: "${display}" (term: ${term})`);
      }
    }
  }
  assert('No forbidden claims ("Live fare", "Exact fare", "Current Ola/Uber price")', !foundForbidden);

  // TEST 8: Phase 7 Recommendations & Filters Preservation
  console.log('\n--- TEST 8: Phase 7 Recommendation Engine Preservation ---');
  try {
    const placesRes = await fetch(`${BASE_URL}/places?lat=17.3616&lon=78.4747&radius=10000`);
    const placesData = await placesRes.json();
    assert('Places API returns places array', Array.isArray(placesData.places) && placesData.places.length > 0);
    const samplePlace = placesData.places[0];
    assert('Place has id, name, category, and coordinates', 
      !!samplePlace.id && !!samplePlace.name && !!samplePlace.category && typeof samplePlace.lat === 'number');
  } catch (err) {
    assert('Places API test failed', false, err.message);
  }

  // Summary
  console.log('\n================================================================');
  console.log(`   SUMMARY: Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
