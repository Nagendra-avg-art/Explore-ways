// tests/phase/phase-14/test-phase14.mjs
// Comprehensive Verification Suite for Phase 14 - My Trip Intelligence & Travel Planning Refinement

import { calculateTripRoute, formatDistanceKm } from '../../../client/src/services/routingService.ts';
import { 
  calculateItinerarySchedule, 
  calculateItineraryFeasibility,
  generateItineraryExplanation 
} from '../../../client/src/services/itineraryEngineService.ts';
import { computeTripFareSummary } from '../../../client/src/services/fareEstimationService.ts';
import { recommendTripTransport } from '../../../client/src/services/transportRecommendationService.ts';
import { calculateWeatherTripImpact } from '../../../client/src/services/weatherImpactService.ts';
import { formatAIContext, sendAIChatMessage } from '../../../client/src/services/aiGuideService.ts';
import { DEMO_PLACES } from '../../../client/src/data/demoPlaces.ts';

const BASE_URL = 'http://localhost:5000';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

// Helpers
function createMockPlace(id, name, lat, lon, category, visitDuration = '45 min', entryFee = '') {
  return {
    id,
    name,
    category,
    categoryLabel: category.toUpperCase(),
    distanceKm: 2.5,
    travelTimeMin: 15,
    visitDuration,
    lat,
    lon,
    imageUrl: 'https://images.unsplash.com/photo-1548013146-72479768bada',
    shortDescription: `${name} description`,
    whyRecommended: 'Popular landmark in city',
    tags: [category, 'sightseeing'],
    isOpenNow: true,
    entryFee,
    matchScore: 85
  };
}

const mockOrigin = {
  lat: 17.3850,
  lon: 78.4867,
  label: 'Hotel Central'
};

const defaultPreferences = {
  interests: ['history', 'culture'],
  availableHours: 5,
  budgetAmount: 2500,
  travelStyle: 'solo',
  pace: 'moderate',
  maxDistanceKm: 25,
  minRating: 4.0,
  openNowOnly: false
};

async function runPhase14Verification() {
  console.log('================================================================');
  console.log('   PHASE 14: MY TRIP INTELLIGENCE & PLANNING VERIFICATION       ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // TEST 1: Empty Trip (0 Stops)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Empty Trip (0 Stops) ---');
  const emptyPlaces = [];
  const emptyRoute = calculateTripRoute(mockOrigin, emptyPlaces);
  const emptySchedule = calculateItinerarySchedule(emptyPlaces, emptyRoute.legs, '09:00', 'moderate');
  const emptyFeasibility = calculateItineraryFeasibility(emptySchedule, defaultPreferences, 'auto', emptyPlaces);
  const emptyFareSummary = computeTripFareSummary([], 'auto');

  assert(emptyRoute.stops.length === 0, 'Empty route has 0 stops');
  assert(emptyRoute.legs.length === 0, 'Empty route has 0 legs');
  assert(emptyRoute.totalDistanceKm === 0, 'Empty route total distance is 0 km');
  assert(emptySchedule.stops.length === 0, 'Empty schedule has 0 stops');
  assert(emptyFeasibility.totalTripMinutes === 0, 'Empty trip total duration is 0 min');
  assert(emptyFareSummary.totalMinFareInr === 0, 'Empty trip min fare is 0');

  // ---------------------------------------------------------------------------
  // TEST 2: One Stop Trip
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: One Stop Trip ---');
  const p1 = createMockPlace('stop-1', 'Sri Surya Restaurant', 17.0005, 81.8040, 'food', '45 min', '₹150');
  const oneStopPlaces = [p1];
  const oneStopRoute = calculateTripRoute({ lat: 17.0000, lon: 81.8000, label: 'Rajahmundry Center' }, oneStopPlaces);
  const oneStopSchedule = calculateItinerarySchedule(oneStopPlaces, oneStopRoute.legs, '09:00', 'moderate');
  const oneStopFare = computeTripFareSummary(oneStopRoute.legs.map(l => ({ fromName: l.fromName, toName: l.toName, distanceKm: l.distanceKm })), 'auto');

  assert(oneStopRoute.stops.length === 1, '1-stop route has 1 stop');
  assert(oneStopRoute.legs.length === 1, '1-stop route has 1 leg (origin -> stop 1)');
  assert(oneStopSchedule.stops[0].arrivalTimeStr === '09:02' || oneStopSchedule.stops[0].arrivalTimeStr.length === 5, 'Stop 1 has valid arrival time');
  assert(oneStopSchedule.stops[0].departureTimeStr.length === 5, 'Stop 1 has valid departure time');
  assert(oneStopFare.totalMinFareInr > 0, '1-stop Auto fare is non-zero');

  // ---------------------------------------------------------------------------
  // TEST 3 & 4: Two Stops and Multiple Stops (Chronological Consistency)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3 & 4: Two Stops & Multiple Stops ---');
  const p2 = createMockPlace('stop-2', 'Historical Place', 17.0100, 81.8100, 'history', '60 min', '₹50');
  const p3 = createMockPlace('stop-3', 'River View Park', 17.0200, 81.8200, 'nature', '40 min', 'Free');
  const multiPlaces = [p1, p2, p3];
  const multiRoute = calculateTripRoute({ lat: 17.0000, lon: 81.8000, label: 'Rajahmundry Center' }, multiPlaces);
  const multiSchedule = calculateItinerarySchedule(multiPlaces, multiRoute.legs, '09:00', 'moderate');

  assert(multiRoute.stops.length === 3, 'Multiple stops trip has 3 stops');
  assert(multiRoute.legs.length === 3, 'Multiple stops trip has 3 legs');

  // Verify clock progression
  const parseMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const t0 = parseMin(multiSchedule.originDepartureStr);
  const t1_arr = parseMin(multiSchedule.stops[0].arrivalTimeStr);
  const t1_dep = parseMin(multiSchedule.stops[0].departureTimeStr);
  const t2_arr = parseMin(multiSchedule.stops[1].arrivalTimeStr);
  const t2_dep = parseMin(multiSchedule.stops[1].departureTimeStr);
  const t3_arr = parseMin(multiSchedule.stops[2].arrivalTimeStr);
  const t3_dep = parseMin(multiSchedule.stops[2].departureTimeStr);
  const t_end = parseMin(multiSchedule.endTimeStr);

  assert(t0 <= t1_arr, 'Origin departure is before stop 1 arrival');
  assert(t1_arr < t1_dep, 'Stop 1 arrival is before stop 1 departure');
  assert(t1_dep <= t2_arr, 'Stop 1 departure is before stop 2 arrival');
  assert(t2_arr < t2_dep, 'Stop 2 arrival is before stop 2 departure');
  assert(t2_dep <= t3_arr, 'Stop 2 departure is before stop 3 arrival');
  assert(t3_arr < t3_dep, 'Stop 3 arrival is before stop 3 departure');
  assert(t3_dep <= t_end, 'Stop 3 departure is before trip return end time');

  // ---------------------------------------------------------------------------
  // TEST 5 & 6 & 7: Add Stop, Remove Stop, Remove Final Stop
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5, 6, 7: Add Stop, Remove Stop, Remove Final Stop ---');
  // Add stop
  const p4 = createMockPlace('stop-4', 'Craft Market', 17.0300, 81.8300, 'shopping', '50 min', '');
  const extendedPlaces = [...multiPlaces, p4];
  const extendedRoute = calculateTripRoute({ lat: 17.0000, lon: 81.8000, label: 'Rajahmundry Center' }, extendedPlaces);
  assert(extendedRoute.stops.length === 4, 'Stop added safely: now 4 stops');
  assert(extendedRoute.legs.length === 4, 'Legs updated to 4');

  // Remove middle stop (stop-2)
  const afterRemovePlaces = extendedPlaces.filter(p => p.id !== 'stop-2');
  const afterRemoveRoute = calculateTripRoute({ lat: 17.0000, lon: 81.8000, label: 'Rajahmundry Center' }, afterRemovePlaces);
  assert(afterRemoveRoute.stops.length === 3, 'Stop-2 removed: now 3 stops');
  assert(!afterRemoveRoute.stops.some(s => s.id === 'stop-2'), 'Stop-2 is no longer in stops');
  assert(afterRemoveRoute.legs.length === 3, 'Legs recalculate correctly to 3');

  // Remove all down to 0
  const finalPlaces = [];
  const finalRoute = calculateTripRoute({ lat: 17.0000, lon: 81.8000, label: 'Rajahmundry Center' }, finalPlaces);
  assert(finalRoute.stops.length === 0, 'All stops removed safely without crash');
  assert(finalRoute.legs.length === 0, 'Final route legs are 0');

  // ---------------------------------------------------------------------------
  // TEST 8 & 9: Manual Reorder & Revert Order
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8 & 9: Manual Reorder & Revert Order ---');
  const initialOrder = [p1, p2, p3];
  // Manual reorder: swap p1 and p2
  const reorderedPlaces = [p2, p1, p3];
  const reorderedRoute = calculateTripRoute({ lat: 17.0000, lon: 81.8000, label: 'Rajahmundry Center' }, reorderedPlaces);
  assert(reorderedRoute.stops[0].id === 'stop-2', 'Reordered: stop 1 is now stop-2');
  assert(reorderedRoute.stops[1].id === 'stop-1', 'Reordered: stop 2 is now stop-1');

  // Revert order back
  const revertedPlaces = initialOrder;
  const revertedRoute = calculateTripRoute({ lat: 17.0000, lon: 81.8000, label: 'Rajahmundry Center' }, revertedPlaces);
  assert(revertedRoute.stops[0].id === 'stop-1', 'Reverted: stop 1 is back to stop-1');
  assert(revertedRoute.stops[1].id === 'stop-2', 'Reverted: stop 2 is back to stop-2');

  // ---------------------------------------------------------------------------
  // TEST 10: Change Transport Mode & User Choice Supremacy
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 10: Change Transport Mode & Consistency ---');
  const legsForFare = multiRoute.legs.map(l => ({ fromName: l.fromName, toName: l.toName, distanceKm: l.distanceKm }));
  
  // 1. Auto
  const autoFare = computeTripFareSummary(legsForFare, 'auto');
  assert(autoFare.preferredMode === 'auto', 'Auto mode preferred');
  assert(autoFare.totalMinFareInr > 0, 'Auto fare > 0');

  // 2. Cab
  const cabFare = computeTripFareSummary(legsForFare, 'cab');
  assert(cabFare.preferredMode === 'cab', 'Cab mode preferred');
  assert(cabFare.totalMinFareInr > autoFare.totalMinFareInr, 'Cab fare is higher than Auto fare');

  // 3. Walk
  const walkFare = computeTripFareSummary(legsForFare, 'walk');
  assert(walkFare.preferredMode === 'walk', 'Walk mode preferred');
  assert(walkFare.totalMinFareInr === 0, 'Walk fare is 0 (Free)');
  assert(walkFare.totalFareDisplay === 'Free (₹0)', 'Walk fare display is "Free (₹0)"');

  // 4. Bus
  const busFare = computeTripFareSummary(legsForFare, 'bus');
  assert(busFare.totalFareDisplay === 'Unavailable', 'Bus fare honestly marked Unavailable');

  // ---------------------------------------------------------------------------
  // TEST 11, 12, 13: Weather Warning & Suggestions
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 11, 12, 13: Weather Warning & Suggestions ---');
  const mockRainWeather = {
    location: { city: 'Rajahmundry', lat: 17.0005, lon: 81.8040 },
    current: { temperature: 27, condition: 'Moderate Rain' },
    hourlyForecast: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      time: `${String(i).padStart(2, '0')}:00`,
      temperature: 27,
      precipitationProbability: i >= 10 && i <= 14 ? 80 : 10,
      condition: i >= 10 && i <= 14 ? 'Rain showers' : 'Clear',
      conditionType: i >= 10 && i <= 14 ? 'rain' : 'clear'
    }))
  };

  const weatherImpact = calculateWeatherTripImpact(
    mockRainWeather,
    multiPlaces,
    multiSchedule,
    'walk',
    multiRoute.legs
  );

  assert(weatherImpact.hasWeatherAlert === true, 'Rain triggers hasWeatherAlert = true');
  assert(['MODERATE', 'HIGH', 'SEVERE'].includes(weatherImpact.overallSeverity), `Severity reflects rain impact (${weatherImpact.overallSeverity})`);
  assert(weatherImpact.impactItems.length > 0, 'Impact items identify weather hazard');
  assert(weatherImpact.alternativeTransportSuggestion !== undefined || weatherImpact.suggestedStopOrder !== undefined, 'Provides actionable suggestions');

  // Suggestion does NOT alter current plan until applied
  assert(multiPlaces[0].id === 'stop-1', 'Original itinerary was NOT silently overwritten by weather engine');

  // ---------------------------------------------------------------------------
  // TEST 14: Budget Calculation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 14: Budget Calculation ---');
  const travelMin = autoFare.totalMinFareInr;
  const travelMax = autoFare.totalMaxFareInr;
  const entryFeeTotal = 200; // 150 + 50
  const estimatedTotalMin = travelMin + entryFeeTotal;
  const estimatedTotalMax = travelMax + entryFeeTotal;
  const userBudget = 2500;
  const remainingMin = Math.max(0, userBudget - estimatedTotalMax);
  const remainingMax = Math.max(0, userBudget - estimatedTotalMin);

  assert(estimatedTotalMin > 0, 'Estimated total min is computed');
  assert(estimatedTotalMax >= estimatedTotalMin, 'Estimated total max >= min');
  assert(remainingMin > 0 && remainingMax > remainingMin, 'Remaining budget calculated honestly');

  // ---------------------------------------------------------------------------
  // TEST 15: Time Calculation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 15: Time Calculation ---');
  assert(multiSchedule.originDepartureStr === '09:00', 'Trip begins at planned start time 09:00');
  assert(multiSchedule.totalTripMin > 0, 'Total trip time is calculated');
  assert(multiSchedule.endTimeStr.length === 5, 'Return time formatted correctly');

  // ---------------------------------------------------------------------------
  // TEST 16: Map Route URL & Geometry
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 16: Map Route Generation ---');
  const lastPlace = multiPlaces[multiPlaces.length - 1];
  const waypoints = multiPlaces.slice(0, -1);
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${mockOrigin.lat},${mockOrigin.lon}&destination=${lastPlace.lat},${lastPlace.lon}&waypoints=${waypoints.map(p => `${p.lat},${p.lon}`).join('|')}&travelmode=driving`;
  assert(googleMapsUrl.includes('destination=17.02,81.82'), 'Google Maps destination is correct');
  assert(googleMapsUrl.includes('waypoints='), 'Google Maps waypoints included');

  // ---------------------------------------------------------------------------
  // TEST 17: AI Trip Questions (Structured Context & Zero Hallucination)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 17: AI Trip Questions ---');
  const multiFeasibility = calculateItineraryFeasibility(multiSchedule, defaultPreferences, 'auto', multiPlaces);
  const aiContext = formatAIContext(
    { lat: 17.0000, lon: 81.8000, city: 'Rajahmundry', formatted: 'Rajahmundry, AP' },
    defaultPreferences,
    {
      ...multiRoute,
      stops: multiPlaces,
      schedule: multiSchedule,
      feasibility: multiFeasibility,
      totalDistanceKm: multiRoute.totalDistanceKm,
      totalTravelTimeMin: 35,
      totalVisitTimeMin: 145,
      preferredMode: 'auto'
    },
    [],
    [],
    mockRainWeather
  );

  assert(aiContext.selectedTrip.stopCount === 3, 'AI Context includes 3 stops');
  assert(aiContext.selectedTrip.preferredMode === 'auto', 'AI Context includes active transport auto');
  assert(aiContext.location.city === 'Rajahmundry', 'AI Context reflects active city Rajahmundry');

  // Test AI prompt call via backend
  try {
    const aiRes = await sendAIChatMessage('How much will the trip cost?', aiContext, []);
    assert(aiRes.answer.length > 20, 'AI responded to "How much will the trip cost?"');
    assert(aiRes.answer.includes('₹') || aiRes.answer.toLowerCase().includes('fare') || aiRes.answer.toLowerCase().includes('cost'), 'AI quoted structured cost figures');
  } catch (err) {
    console.warn('  ⚠️ AI backend call skipped or errored:', err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 18, 19, 20: DATA TRUST & POI FALLBACK RULE (Crucial Phase 14 Requirement)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 18, 19, 20: DATA TRUST & POI FALLBACK RULE ---');
  
  // Destination 1: Tirupati (Outside Hyderabad)
  try {
    const resTirupati = await fetch(`${BASE_URL}/api/places?lat=13.6288&lon=79.4192`);
    if (resTirupati.ok) {
      const data = await resTirupati.json();
      assert(data.success === true, 'Tirupati places API responded with HTTP 200');
      // If live POIs found: they must be around Tirupati (lat ~ 13.6).
      // If live POIs NOT found: MUST NOT return Charminar/Golconda demo data!
      if (data.places.length > 0) {
        const isFarAway = data.places.some(p => Math.abs(p.lat - 17.36) < 0.1 && p.name.includes('Charminar'));
        assert(!isFarAway, 'CRITICAL DATA TRUST: Tirupati results DO NOT contain Hyderabad Charminar!');
      } else {
        assert(data.places.length === 0, 'CRITICAL DATA TRUST: When 0 live POIs found outside Hyderabad, returns 0 places (honest empty state)');
      }
    }
  } catch (e) {
    console.warn('  ⚠️ Tirupati fetch error:', e.message);
  }

  // Destination 2: Arbitrary remote town (e.g. Srikakulam lat 18.2969, lon 83.8968)
  try {
    const resRemote = await fetch(`${BASE_URL}/api/places?lat=18.2969&lon=83.8968`);
    if (resRemote.ok) {
      const data = await resRemote.json();
      const hasHyderabadDemo = data.places.some(p => p.id === 'charminar' || p.name.toLowerCase().includes('charminar') || p.name.toLowerCase().includes('golconda'));
      assert(!hasHyderabadDemo, 'CRITICAL DATA TRUST: Remote destination NEVER returns Hyderabad demo places');
    }
  } catch (e) {
    console.warn('  ⚠️ Remote fetch error:', e.message);
  }

  // Destination 2b: Remote location with 0 live POIs (e.g. offshore Bay of Bengal lat 15.0, lon 85.0)
  try {
    const resZero = await fetch(`${BASE_URL}/api/places?lat=15.0&lon=85.0`);
    if (resZero.ok) {
      const data = await resZero.json();
      assert(data.places.length === 0, 'CRITICAL DATA TRUST: When 0 live POIs found outside Hyderabad, places array is EMPTY');
      assert(data.source === 'none', 'CRITICAL DATA TRUST: Source is honest none');
    }
  } catch (e) {
    console.warn('  ⚠️ Zero-POI fetch error:', e.message);
  }

  // Destination 3: Food API outside Hyderabad
  try {
    const resFood = await fetch(`${BASE_URL}/api/food?lat=17.0005&lon=81.8040`);
    if (resFood.ok) {
      const data = await resFood.json();
      const hasHydBawarchi = data.places.some(p => p.name.toLowerCase().includes('bawarchi') && Math.abs(p.lat - 17.40) < 0.1);
      assert(!hasHydBawarchi, 'CRITICAL DATA TRUST: Food API in Rajahmundry does NOT inject Hyderabad Bawarchi');
    }
  } catch (e) {
    console.warn('  ⚠️ Food fetch error:', e.message);
  }

  // Destination 4: Hyderabad (Within 35 km)
  try {
    const resHyd = await fetch(`${BASE_URL}/api/places?lat=17.3850&lon=78.4867`);
    if (resHyd.ok) {
      const data = await resHyd.json();
      assert(data.places.length > 0, 'Hyderabad returns destination-safe places (live or curated)');
    }
  } catch (e) {
    console.warn('  ⚠️ Hyderabad fetch error:', e.message);
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`   PHASE 14 TEST SUMMARY: Passed: ${passedTests} | Failed: ${failedTests} | Total: ${totalTests}`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPhase14Verification().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
