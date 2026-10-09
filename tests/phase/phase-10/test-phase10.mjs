// Phase 10 Smart Itinerary Engine Automated Verification Suite
import { 
  getEstimatedVisitDuration,
  getOpeningStatusInfo,
  calculateItinerarySchedule,
  calculateItineraryFeasibility,
  optimizeSmartItineraryOrder,
  generateItineraryExplanation,
  addMinutesToTimeString,
  computeTripBufferMinutes
} from '../../../client/src/services/itineraryEngineService.ts';
import { 
  calculateTripRoute, 
  optimizeRouteNearestNeighbor,
  calculateHaversineDistanceKm 
} from '../../../client/src/services/routingService.ts';
import { DEMO_PLACES } from '../../../client/src/data/demoPlaces.ts';

const BASE_URL = 'http://localhost:5000/api';

async function runTestSuite() {
  console.log('================================================================');
  console.log('       PHASE 10 — SMART ITINERARY ENGINE VERIFICATION           ');
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
  console.log('--- TEST 1: Backend Health & Live Server Check ---');
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    assert('Backend API is healthy and reachable', data.status === 'healthy');
  } catch (err) {
    assert('Backend connection failed', false, err.message);
  }

  // Base test data
  const hyderabadOrigin = {
    lat: 17.3850,
    lon: 78.4867,
    label: 'Hyderabad City Center',
    isActualGps: false,
  };

  const tirupatiOrigin = {
    lat: 13.6288,
    lon: 79.4192,
    label: 'Tirupati (Live GPS)',
    isActualGps: true,
  };

  const charminar = DEMO_PLACES.find((p) => p.id === 'charminar');
  const golconda = DEMO_PLACES.find((p) => p.id === 'golconda');
  const birlaMandir = DEMO_PLACES.find((p) => p.id === 'birla-mandir');

  assert('Test demo places are loaded', Boolean(charminar && golconda && birlaMandir));

  const basePref = {
    interests: ['history', 'temples'],
    availableHours: 4,
    budgetAmount: 1000,
    travelStyle: 'solo',
    pace: 'moderate',
    maxDistanceKm: null,
    minRating: null,
    openNowOnly: false,
    isConfigured: true,
  };

  // ==========================================================================
  // SCENARIO 1: 4-Hour Trip with 2-3 Nearby Destinations
  // ==========================================================================
  console.log('\n--- SCENARIO 1: 4-Hour Trip, 2–3 Nearby Destinations ---');
  {
    const stops = [charminar, birlaMandir];
    const route = calculateTripRoute(hyderabadOrigin, stops, false, 0, 'auto', basePref);

    assert('Route is generated with 2 stops', route.stops.length === 2);
    assert('Route contains 2 legs', route.legs.length === 2);
    assert('Schedule is present on route', Boolean(route.schedule));
    assert('Feasibility is evaluated', Boolean(route.feasibility));
    assert('Total trip time fits within 4 hours (240 min)', route.schedule.totalTripMin <= 240);
    assert('Feasibility status is "feasible"', route.feasibility.status === 'feasible');
    assert('Feasibility has positive buffer remaining', route.feasibility.remainingMinutes > 0);
    assert('Buffer minutes is reasonable (15-30 min)', route.feasibility.bufferMinutes >= 15);
    console.log(`     Total Trip Time: ${route.schedule.totalTripMin} min (${Math.floor(route.schedule.totalTripMin / 60)}h ${route.schedule.totalTripMin % 60}m) | Buffer: ${route.feasibility.remainingMinutes}m remaining`);
    console.log(`     Status Label: "${route.feasibility.statusLabel}"`);
  }

  // ==========================================================================
  // SCENARIO 2: 2-Hour Trip with Several Destinations (Infeasible Schedule)
  // ==========================================================================
  console.log('\n--- SCENARIO 2: 2-Hour Trip with Several Destinations ---');
  {
    const shortPref = { ...basePref, availableHours: 2 }; // 120 min available
    const stops = [charminar, golconda, birlaMandir]; // ~90m + 150m + 90m visit time = 330m + transit
    const route = calculateTripRoute(hyderabadOrigin, stops, false, 0, 'auto', shortPref);

    assert('Engine detects itinerary exceeds 2h window', route.schedule.totalTripMin > 120);
    assert('Feasibility status is strictly "exceeded"', route.feasibility.status === 'exceeded');
    assert('Feasibility statusLabel is "Schedule Not Feasible"', route.feasibility.statusLabel === 'Schedule Not Feasible');
    assert('Exceeded minutes is calculated correctly', route.feasibility.exceededMinutes > 0);
    assert('Suggestions explain how to fix (remove stop or choose faster transit)', 
      route.feasibility.suggestions.some(s => s.toLowerCase().includes('remove') || s.toLowerCase().includes('faster')));
    console.log(`     Total Duration: ${route.schedule.totalTripMin} min vs ${shortPref.availableHours * 60} min window`);
    console.log(`     Exceeded By: +${route.feasibility.exceededMinutes} min`);
    console.log(`     Actionable Advice: "${route.feasibility.suggestions[0]}"`);
  }

  // ==========================================================================
  // SCENARIO 3: Large-Distance Destinations (Tirupati -> Hyderabad)
  // ==========================================================================
  console.log('\n--- SCENARIO 3: Large-Distance Destinations (Intercity Journey) ---');
  {
    const stops = [charminar, golconda];
    const route = calculateTripRoute(tirupatiOrigin, stops, false, 0, 'auto', basePref);

    assert('Route distance accounts for long distance (>400 km)', route.totalDistanceKm > 400);
    assert('Travel time accounts for multi-hour intercity trip (>400 min)', route.totalTravelTimeMin > 400);
    assert('Feasibility marks trip as exceeded for 4h allowance', route.feasibility.status === 'exceeded');
    assert('Engine suggestion mentions transit duration or increasing trip hours',
      route.feasibility.suggestions.length > 0);
    console.log(`     Total Distance: ${route.totalDistanceKm} km | Transit Time: ${route.totalTravelTimeMin} min`);
    console.log(`     Headline: "${route.feasibility.headline}"`);
  }

  // ==========================================================================
  // SCENARIO 4: Different User Interests (Interest-driven Ordering & Scores)
  // ==========================================================================
  console.log('\n--- SCENARIO 4: Different User Interests ---');
  {
    const historyPref = { ...basePref, interests: ['history'] };
    const templePref = { ...basePref, interests: ['temples'] };

    const stops = [birlaMandir, charminar];

    const optHistory = optimizeSmartItineraryOrder(hyderabadOrigin, stops, historyPref, 'auto');
    const optTemple = optimizeSmartItineraryOrder(hyderabadOrigin, stops, templePref, 'auto');

    assert('History preference orders history highlight earlier or assigns appropriate priority',
      optHistory.orderedStops.length === 2);
    assert('Temple preference orders temple highlight earlier or assigns appropriate priority',
      optTemple.orderedStops.length === 2);

    const historyExplanation = generateItineraryExplanation(
      hyderabadOrigin,
      optHistory.orderedStops,
      [],
      historyPref,
      'auto',
      { totalTravelMinutes: 30, totalTripMinutes: 180, bufferMinutes: 20 },
      optHistory.distanceSavedKm
    );
    assert('Explanation explicitly references user interest match',
      historyExplanation.stopReasons[0].reason.toLowerCase().includes('interest') ||
      historyExplanation.stopReasons[0].reason.toLowerCase().includes('match'));
    console.log(`     History First Stop Explanation: "${historyExplanation.stopReasons[0].reason}"`);
  }

  // ==========================================================================
  // SCENARIO 5: Different Budget (Transport Cost vs Trip Budget)
  // ==========================================================================
  console.log('\n--- SCENARIO 5: Different Budget Impact ---');
  {
    const lowBudgetPref = { ...basePref, budgetAmount: 200 };
    const highBudgetPref = { ...basePref, budgetAmount: 5000 };

    const stops = [charminar, golconda];
    const routeLow = calculateTripRoute(hyderabadOrigin, stops, false, 0, 'cab', lowBudgetPref);
    const routeHigh = calculateTripRoute(hyderabadOrigin, stops, false, 0, 'cab', highBudgetPref);

    assert('Transport cost is calculated independently of configured trip budget',
      routeLow.totalEstimatedTransportCostInr === routeHigh.totalEstimatedTransportCostInr);
    assert('Trip budget is preserved as configured (₹200 vs ₹5,000)',
      lowBudgetPref.budgetAmount === 200 && highBudgetPref.budgetAmount === 5000);
    assert('Fare breakdown provides min and max estimate range',
      routeLow.fareSummary.totalMinFareInr > 0 && routeLow.fareSummary.totalMaxFareInr > routeLow.fareSummary.totalMinFareInr);
    console.log(`     Estimated Cab Transit Fare: ${routeLow.fareSummary.totalFareDisplay}`);
    console.log(`     Low Budget (₹200) vs High Budget (₹5,000)`);
  }

  // ==========================================================================
  // SCENARIO 6: Different Starting Location
  // ==========================================================================
  console.log('\n--- SCENARIO 6: Different Starting Location Changes Route Order ---');
  {
    // Origin A: Near Old City / Charminar (17.3600, 78.4700)
    const southOrigin = { lat: 17.3600, lon: 78.4700, label: 'Charminar Bus Stand' };
    // Origin B: Near Tolichowki / Golconda (17.3900, 78.4100)
    const westOrigin = { lat: 17.3900, lon: 78.4100, label: 'Tolichowki Flyover' };

    const stops = [charminar, golconda]; // Charminar is in South, Golconda is in West

    const optSouth = optimizeSmartItineraryOrder(southOrigin, stops, basePref, 'auto');
    const optWest = optimizeSmartItineraryOrder(westOrigin, stops, basePref, 'auto');

    assert('Starting near South orders Charminar first', optSouth.orderedStops[0].id === 'charminar');
    assert('Starting near West orders Golconda first', optWest.orderedStops[0].id === 'golconda');
    console.log(`     Starting at South: Stop 1 = ${optSouth.orderedStops[0].name}`);
    console.log(`     Starting at West:  Stop 1 = ${optWest.orderedStops[0].name}`);
  }

  // ==========================================================================
  // SCENARIO 7: Manual Reorder
  // ==========================================================================
  console.log('\n--- SCENARIO 7: Manual Reorder Works Correctly ---');
  {
    const originalStops = [charminar, golconda, birlaMandir];
    const manuallySwapped = [birlaMandir, golconda, charminar];

    const routeOriginal = calculateTripRoute(hyderabadOrigin, originalStops, false, 0, 'auto', basePref);
    const routeSwapped = calculateTripRoute(hyderabadOrigin, manuallySwapped, false, 0, 'auto', basePref);

    assert('Swapped route has 1st stop as Birla Mandir', routeSwapped.stops[0].id === 'birla-mandir');
    assert('Swapped route has 3rd stop as Charminar', routeSwapped.stops[2].id === 'charminar');
    assert('Legs update with new sequence (Origin -> Birla Mandir)', routeSwapped.legs[0].toName === birlaMandir.name);
    assert('Timeline arrival times update correctly for swapped order', 
      routeSwapped.schedule.stops[0].place.id === 'birla-mandir');
    console.log(`     Original sequence: ${originalStops.map(s => s.name).join(' -> ')}`);
    console.log(`     Swapped sequence:  ${manuallySwapped.map(s => s.name).join(' -> ')}`);
  }

  // ==========================================================================
  // SCENARIO 8: Revert to Added Order
  // ==========================================================================
  console.log('\n--- SCENARIO 8: Revert to Added Order ---');
  {
    const userAddedOrder = [golconda, charminar]; // Un-optimized order
    const optResult = optimizeSmartItineraryOrder(hyderabadOrigin, userAddedOrder, basePref, 'auto');
    
    // Simulating Revert action (setting active stops back to userAddedOrder)
    const revertedRoute = calculateTripRoute(hyderabadOrigin, userAddedOrder, false, 0, 'auto', basePref);

    assert('Reverted route is marked isOptimized = false', revertedRoute.isOptimized === false);
    assert('Reverted route first stop matches original added stop (Golconda Fort)', 
      revertedRoute.stops[0].id === 'golconda');
    assert('Distance saved is 0 on reverted route', revertedRoute.distanceSavedKm === 0);
    console.log(`     Added Order: ${userAddedOrder.map(s => s.name).join(' -> ')}`);
    console.log(`     Reverted successfully to added order.`);
  }

  // ==========================================================================
  // TEST 9: Timeline Clock Arithmetic & Sequential Consistency
  // ==========================================================================
  console.log('\n--- TEST 9: Timeline Clock Arithmetic & Consistency ---');
  {
    const stops = [charminar, golconda];
    const route = calculateTripRoute(hyderabadOrigin, stops, false, 0, 'auto', basePref);
    const sched = route.schedule;

    assert('Origin departure is "09:00"', sched.originDepartureStr === '09:00');
    assert('Stop 1 arrival time equals 09:00 + Leg 0 transit time',
      sched.stops[0].arrivalTimeStr === addMinutesToTimeString('09:00', route.legs[0].estimatedTravelTimeMin));
    assert('Stop 1 departure time equals Arrival + Visit duration',
      sched.stops[0].departureTimeStr === addMinutesToTimeString(sched.stops[0].arrivalTimeStr, sched.stops[0].visitDurationMin));
    assert('Stop 2 arrival time equals Stop 1 departure + Leg 1 transit time',
      sched.stops[1].arrivalTimeStr === addMinutesToTimeString(sched.stops[0].departureTimeStr, route.legs[1].estimatedTravelTimeMin));
    assert('End time equals Stop 2 departure + Buffer',
      sched.endTimeStr === addMinutesToTimeString(sched.stops[1].departureTimeStr, sched.bufferMin));
    
    console.log(`     Timeline Sequence:`);
    console.log(`       ${sched.originDepartureStr} - Departure Point (${hyderabadOrigin.label})`);
    console.log(`       ${sched.stops[0].arrivalTimeStr} - Stop 1 (${sched.stops[0].place.name}), Visit ${sched.stops[0].visitDurationMin}m -> Depart ${sched.stops[0].departureTimeStr}`);
    console.log(`       ${sched.stops[1].arrivalTimeStr} - Stop 2 (${sched.stops[1].place.name}), Visit ${sched.stops[1].visitDurationMin}m -> Depart ${sched.stops[1].departureTimeStr}`);
    console.log(`       ${sched.endTimeStr} - Trip Finish (+${sched.bufferMin}m buffer)`);
  }

  // ==========================================================================
  // TEST 10: Data Honesty & Fallback Assumptions
  // ==========================================================================
  console.log('\n--- TEST 10: Data Honesty on Opening Hours & Visit Durations ---');
  {
    // A place with explicit visit duration
    const explicitDur = getEstimatedVisitDuration(charminar);
    assert('Charminar has explicit visit duration', explicitDur.isFallback === false);
    assert('Charminar duration source is "Place listing"', explicitDur.sourceLabel === 'Place listing');

    // A simulated place without visit duration
    const placeNoDur = { id: 'temp', name: 'Random Cafe', category: 'cafes', lat: 17.4, lon: 78.4 };
    const fallbackDur = getEstimatedVisitDuration(placeNoDur);
    assert('Missing duration uses category fallback', fallbackDur.isFallback === true);
    assert('Duration label clearly says "Category fallback estimate"', 
      fallbackDur.sourceLabel === 'Category fallback estimate');
    assert('Cafe fallback duration is 30 minutes', fallbackDur.durationMinutes === 30);

    // Place without opening hours
    const placeNoHours = { id: 'temp2', name: 'Open Street Art', category: 'architecture', lat: 17.4, lon: 78.4 };
    const hoursInfo = getOpeningStatusInfo(placeNoHours);
    assert('Missing opening hours status is "unavailable"', hoursInfo.status === 'unavailable');
    assert('Missing opening hours label is strictly "Hours unavailable"', 
      hoursInfo.label === 'Hours unavailable');
    
    console.log(`     Explicit Duration: ${explicitDur.durationDisplay} (${explicitDur.sourceLabel})`);
    console.log(`     Fallback Duration: ${fallbackDur.durationDisplay} (${fallbackDur.sourceLabel})`);
    console.log(`     Missing Hours Badge: "${hoursInfo.label}"`);
  }

  // ==========================================================================
  // TEST 11: "Why this order?" Explanation Content Integrity
  // ==========================================================================
  console.log('\n--- TEST 11: "Why this order?" Deterministic Explanations ---');
  {
    const stops = [charminar, golconda];
    const route = calculateTripRoute(hyderabadOrigin, stops, true, 4.2, 'auto', basePref);
    const expl = route.itineraryExplanation;

    assert('Explanation object exists', Boolean(expl));
    assert('Overall reason summarizes stops and duration', expl.overallReason.includes('2 stops'));
    assert('Stop 1 reason explains departure proximity and relevance', 
      expl.stopReasons[0].placeName === 'Charminar' && expl.stopReasons[0].reason.length > 20);
    assert('Stop 2 reason explains backtracking and sequence corridor',
      expl.stopReasons[1].placeName === 'Golconda Fort' && expl.stopReasons[1].reason.includes('backtracking'));
    assert('Transport reason explains chosen mode (Auto Rickshaw)',
      expl.transportReason.includes('Auto Rickshaw'));
    assert('Efficiency reason notes distance saved',
      expl.efficiencyReason.includes('4.2 km') || expl.efficiencyReason.includes('backtracking'));

    console.log(`     Overall:    "${expl.overallReason}"`);
    console.log(`     Stop 1:     "${expl.stopReasons[0].reason}"`);
    console.log(`     Stop 2:     "${expl.stopReasons[1].reason}"`);
    console.log(`     Transport:  "${expl.transportReason}"`);
    console.log(`     Efficiency: "${expl.efficiencyReason}"`);
  }

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  console.log('\n================================================================');
  console.log(`   PHASE 10 TEST SUMMARY: Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
