// My Trip Stabilization & Empty State Automated Verification Suite
import { 
  calculateTripRoute, 
  optimizeRouteNearestNeighbor,
  calculateHaversineDistanceKm 
} from '../../../client/src/services/routingService.ts';
import { 
  computeTripFareSummary 
} from '../../../client/src/services/fareEstimationService.ts';
import { 
  recommendTripTransport 
} from '../../../client/src/services/transportRecommendationService.ts';
import { 
  generateItineraryExplanation, 
  calculateItinerarySchedule, 
  calculateItineraryFeasibility 
} from '../../../client/src/services/itineraryEngineService.ts';
import { formatAIContext } from '../../../client/src/services/aiGuideService.ts';
import { DEMO_PLACES } from '../../../client/src/data/demoPlaces.ts';

async function runStabilizationTestSuite() {
  console.log('================================================================');
  console.log('   MY TRIP STABILIZATION & LIFECYCLE VERIFICATION SUITE         ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(desc, condition, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  const defaultOrigin = {
    label: 'Hyderabad City Center',
    lat: 17.385,
    lon: 78.4867,
    isActualGps: false,
  };

  const defaultPreferences = {
    interests: ['history', 'temples'],
    availableHours: 4,
    budgetAmount: 1500,
    travelStyle: 'solo',
    pace: 'moderate',
    isConfigured: true,
  };

  const place1 = DEMO_PLACES[0]; // Charminar
  const place2 = DEMO_PLACES[1]; // Golconda Fort
  const place3 = DEMO_PLACES[2]; // Birla Mandir

  console.log('--- TEST 1: Initial Empty State (0 Stops) ---');
  const route0 = calculateTripRoute(defaultOrigin, [], false, 0, 'auto', defaultPreferences);
  assert('Route exists for 0 stops', Boolean(route0));
  assert('0 stops in route', route0.stops.length === 0);
  assert('0 legs in route', route0.legs.length === 0);
  assert('Total distance is 0 km', route0.totalDistanceKm === 0);
  assert('Total travel time is 0 min', route0.totalTravelTimeMin === 0);
  assert('Fare summary is populated and valid', Boolean(route0.fareSummary));
  assert('Fare summary display is valid string', typeof route0.fareSummary.totalFareDisplay === 'string');
  assert('Schedule is populated for 0 stops', Boolean(route0.schedule) && route0.schedule.stops.length === 0);
  assert('Feasibility is evaluated for 0 stops', Boolean(route0.feasibility));
  assert('Itinerary explanation exists for 0 stops', Boolean(route0.itineraryExplanation));
  assert('Explanation overall reason notes no stops', route0.itineraryExplanation.overallReason.includes('No stops'));

  console.log('\n--- TEST 2: Add 1 Stop ---');
  let currentStops = [place1];
  const route1 = calculateTripRoute(defaultOrigin, currentStops, false, 0, 'auto', defaultPreferences);
  assert('Route has 1 stop', route1.stops.length === 1);
  assert('Route has 1 leg (Origin -> Place 1)', route1.legs.length === 1);
  assert('Route distance > 0', route1.totalDistanceKm > 0, `${route1.totalDistanceKm} km`);
  assert('Schedule has 1 stop', route1.schedule.stops.length === 1);
  assert('Fare summary has 1 leg', route1.fareSummary.legs.length === 1);

  console.log('\n--- TEST 3: Remove that 1 Stop (Transitions back to 0 Stops) ---');
  currentStops = [];
  const routeEmptyAfter1 = calculateTripRoute(defaultOrigin, currentStops, false, 0, 'auto', defaultPreferences);
  assert('Route cleanly transitions back to 0 stops', routeEmptyAfter1.stops.length === 0);
  assert('Legs cleared to 0', routeEmptyAfter1.legs.length === 0);
  assert('Total distance resets to 0', routeEmptyAfter1.totalDistanceKm === 0);
  assert('Total travel time resets to 0', routeEmptyAfter1.totalTravelTimeMin === 0);
  assert('Itinerary explanation remains valid without crash', Boolean(routeEmptyAfter1.itineraryExplanation));

  console.log('\n--- TEST 4: Add another Place after Empty State ---');
  currentStops = [place2];
  const routeReadded = calculateTripRoute(defaultOrigin, currentStops, false, 0, 'auto', defaultPreferences);
  assert('Route activates again with 1 stop (Golconda Fort)', routeReadded.stops.length === 1 && routeReadded.stops[0].name === place2.name);
  assert('Route leg connects Origin -> Golconda Fort', routeReadded.legs[0].toName === place2.name);

  console.log('\n--- TEST 5: Add Multiple Places (3 Stops) ---');
  currentStops = [place1, place2, place3];
  const route3 = calculateTripRoute(defaultOrigin, currentStops, false, 0, 'auto', defaultPreferences);
  assert('Route contains 3 stops', route3.stops.length === 3);
  assert('Route contains 3 legs', route3.legs.length === 3);
  assert('Schedule contains 3 stop timelines', route3.schedule.stops.length === 3);
  assert('Schedule chronological consistency', route3.schedule.stops[0].departureTimeStr <= route3.schedule.stops[1].arrivalTimeStr);

  console.log('\n--- TEST 6: Remove Middle Stop (Stop 2 of 3) ---');
  currentStops = [place1, place3]; // removed place2
  const routeRemoveMiddle = calculateTripRoute(defaultOrigin, currentStops, false, 0, 'auto', defaultPreferences);
  assert('Route now has 2 stops', routeRemoveMiddle.stops.length === 2);
  assert('Route now has 2 legs', routeRemoveMiddle.legs.length === 2);
  assert('Leg 1 now connects Stop 1 -> Stop 3 directly', routeRemoveMiddle.legs[1].fromName === place1.name && routeRemoveMiddle.legs[1].toName === place3.name);

  console.log('\n--- TEST 7: Remove Second Stop (Down to 1 Stop) ---');
  currentStops = [place1];
  const routeDownTo1 = calculateTripRoute(defaultOrigin, currentStops, false, 0, 'auto', defaultPreferences);
  assert('Route down to 1 stop', routeDownTo1.stops.length === 1);
  assert('Route down to 1 leg', routeDownTo1.legs.length === 1);

  console.log('\n--- TEST 8: Remove Final Stop (Down to 0 Stops Empty State) ---');
  currentStops = [];
  const routeFinalZero = calculateTripRoute(defaultOrigin, currentStops, false, 0, 'auto', defaultPreferences);
  assert('Final removal triggers empty state (0 stops)', routeFinalZero.stops.length === 0);
  assert('0 legs remaining', routeFinalZero.legs.length === 0);
  assert('No stale distance', routeFinalZero.totalDistanceKm === 0);
  assert('No stale travel time', routeFinalZero.totalTravelTimeMin === 0);
  assert('Optimization flags cleared', routeFinalZero.isOptimized === false && routeFinalZero.distanceSavedKm === 0);

  console.log('\n--- TEST 9: Add a new place after final-stop removal ---');
  currentStops = [place3];
  const routeRecover = calculateTripRoute(defaultOrigin, currentStops, false, 0, 'auto', defaultPreferences);
  assert('Route recovers immediately with new place', routeRecover.stops.length === 1 && routeRecover.stops[0].id === place3.id);
  assert('Leg connects to newly added place', routeRecover.legs.length === 1 && routeRecover.legs[0].toName === place3.name);

  console.log('\n--- TEST 10: Change Location while Trip is Empty ---');
  const tirupatiOrigin = {
    label: 'Tirupati Center',
    lat: 13.6288,
    lon: 79.4192,
    isActualGps: false,
  };
  const routeLocationChanged = calculateTripRoute(tirupatiOrigin, [], false, 0, 'auto', defaultPreferences);
  assert('Origin updates safely while empty', routeLocationChanged.origin.label === 'Tirupati Center');
  assert('Stops remain 0', routeLocationChanged.stops.length === 0);
  assert('No runtime error on location change with 0 stops', true);

  console.log('\n--- TEST 11: AI Guide Context Formatting with 0 Stops ---');
  const aiContextEmpty = formatAIContext(
    { lat: 17.385, lon: 78.4867, city: 'Hyderabad', isManual: true },
    defaultPreferences,
    routeFinalZero,
    DEMO_PLACES,
    []
  );
  assert('AI Context formats with 0 selected stops without crash', Array.isArray(aiContextEmpty.selectedTrip.stops) && aiContextEmpty.selectedTrip.stops.length === 0);
  assert('Nearby places still available in AI context', aiContextEmpty.topNearbyPlaces.length > 0);

  console.log('\n--- TEST 12: Transport Recommendation on Empty Trip ---');
  const emptyTripFare = computeTripFareSummary([], 'auto');
  assert('Trip fare summary for empty legs returns ₹0', emptyTripFare.totalMinFareInr === 0 && emptyTripFare.totalMaxFareInr === 0);
  const emptyWalkFare = computeTripFareSummary([], 'walk');
  assert('Trip fare summary for walk returns Free (₹0)', emptyWalkFare.totalFareDisplay === 'Free (₹0)');

  console.log('\n================================================================');
  console.log(`   STABILIZATION TEST SUMMARY: Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStabilizationTestSuite().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
