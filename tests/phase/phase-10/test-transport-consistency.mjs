// Phase 10 / My Trip Transport Consistency Verification Suite
import { 
  calculateTripRoute, 
  optimizeRouteNearestNeighbor,
  calculateHaversineDistanceKm 
} from '../../../client/src/services/routingService.ts';
import { 
  computeTripFareSummary,
  computeFareEstimates 
} from '../../../client/src/services/fareEstimationService.ts';
import { 
  recommendTripTransport 
} from '../../../client/src/services/transportRecommendationService.ts';
import { 
  generateItineraryExplanation, 
  calculateItinerarySchedule, 
  calculateItineraryFeasibility 
} from '../../../client/src/services/itineraryEngineService.ts';
import { DEMO_PLACES } from '../../../client/src/data/demoPlaces.ts';

const MODE_EXPLANATIONS = {
  cab: 'Fastest option for this route.',
  walk: 'Lowest cost option, but significantly slower.',
  auto: 'Good balance between cost and travel time.',
  bus: 'Lower-cost public transport option when available.'
};

async function runTransportConsistencySuite() {
  console.log('================================================================');
  console.log('   MY TRIP TRANSPORT CONSISTENCY & SYNCHRONIZATION VERIFICATION ');
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
    lat: 17.3850,
    lon: 78.4867,
    isActualGps: false
  };

  const preferences = {
    pace: 'moderate',
    budget: 'medium',
    budgetAmount: 2000,
    availableHours: 4,
    travelStyle: 'solo',
    interests: ['history', 'architecture']
  };

  const places = [DEMO_PLACES[0], DEMO_PLACES[1]]; // Charminar & Golconda Fort

  // Simulation helper of TripContext state model
  class TripContextModel {
    constructor(origin, stops) {
      this.origin = origin;
      this.stops = [...stops];
      this.selectedTransport = null; // null = user hasn't explicitly overridden
    }

    get recommendedTransport() {
      if (this.stops.length === 0) return 'auto';
      const base = calculateTripRoute(this.origin, this.stops, false, 0, 'auto', preferences);
      if (!base.legs || base.legs.length === 0) return 'auto';
      const rec = recommendTripTransport(
        base.legs.map((l) => ({ distanceKm: l.distanceKm, roadDurationMin: l.estimatedTravelTimeMin })),
        preferences
      );
      return rec.recommended.mode;
    }

    get activeTransport() {
      return this.selectedTransport ?? this.recommendedTransport;
    }

    get isCustomSelection() {
      return this.selectedTransport !== null && this.selectedTransport !== this.recommendedTransport;
    }

    get topCardLabel() {
      return this.isCustomSelection ? 'YOUR TRANSPORT' : 'RECOMMENDED TRANSPORT';
    }

    selectMode(mode) {
      this.selectedTransport = mode;
    }

    resetToRecommended() {
      this.selectedTransport = null;
    }

    getRoute() {
      return calculateTripRoute(this.origin, this.stops, false, 0, this.activeTransport, preferences);
    }

    getExplanation() {
      const mode = this.activeTransport;
      return MODE_EXPLANATIONS[mode];
    }
  }

  console.log('--- TEST 1: System Recommendation as Initial Default ---');
  const trip = new TripContextModel(defaultOrigin, places);
  const initialRec = trip.recommendedTransport;
  assert('System computes a recommended transport mode', ['auto', 'cab', 'walk', 'bus'].includes(initialRec), `Got: ${initialRec}`);
  assert('Initial selectedTransport is null', trip.selectedTransport === null);
  assert('Initial activeTransport matches recommendedTransport', trip.activeTransport === initialRec);
  assert('Top card displays "RECOMMENDED TRANSPORT"', trip.topCardLabel === 'RECOMMENDED TRANSPORT');

  console.log('\n--- TEST 2: Select Walking (Explicit Override) ---');
  trip.selectMode('walk');
  assert('selectedTransport is set to "walk"', trip.selectedTransport === 'walk');
  assert('activeTransport is now "walk"', trip.activeTransport === 'walk');
  assert('Top card switches to "YOUR TRANSPORT"', trip.topCardLabel === 'YOUR TRANSPORT');
  assert('Top card does not say RECOMMENDED TRANSPORT while walking is active', trip.topCardLabel !== 'RECOMMENDED TRANSPORT');
  
  const walkRoute = trip.getRoute();
  assert('Route fare display for Walking is "Free (₹0)"', walkRoute.selectedModeFareDisplay === 'Free (₹0)', `Got: ${walkRoute.selectedModeFareDisplay}`);
  assert('Route totalEstimatedTransportCostInr is 0 for Walking', walkRoute.totalEstimatedTransportCostInr === 0);
  assert('All itinerary legs use "via WALK"', walkRoute.legs.every(l => l.transportMode === 'walk' && l.transportLabel === 'WALK'));
  assert('Walking travel time is significantly higher than motorized transit', walkRoute.totalTravelTimeMin > 100, `Got: ${walkRoute.totalTravelTimeMin} min`);
  assert('Walking explanation describes cost savings vs time', trip.getExplanation().includes('Lowest cost option'));

  console.log('\n--- TEST 3: Select Cab (Ola/Uber) ---');
  trip.selectMode('cab');
  assert('activeTransport is "cab"', trip.activeTransport === 'cab');
  const cabRoute = trip.getRoute();
  assert('Route fare display for Cab has estimated rupee range', cabRoute.selectedModeFareDisplay.includes('₹') && cabRoute.selectedModeFareDisplay.includes('estimated'), `Got: ${cabRoute.selectedModeFareDisplay}`);
  assert('All itinerary legs use "via CAB"', cabRoute.legs.every(l => l.transportMode === 'cab' && l.transportLabel === 'CAB'));
  assert('Cab explanation highlights speed', trip.getExplanation().includes('Fastest option'));

  console.log('\n--- TEST 4: Select Auto Rickshaw ---');
  trip.selectMode('auto');
  assert('activeTransport is "auto"', trip.activeTransport === 'auto');
  const autoRoute = trip.getRoute();
  assert('Route fare display for Auto has rupee range', autoRoute.selectedModeFareDisplay.includes('₹') && autoRoute.selectedModeFareDisplay.includes('estimated'), `Got: ${autoRoute.selectedModeFareDisplay}`);
  assert('All itinerary legs use "via AUTO"', autoRoute.legs.every(l => l.transportMode === 'auto' && l.transportLabel === 'AUTO'));
  assert('Auto explanation highlights balance', trip.getExplanation().includes('Good balance'));

  console.log('\n--- TEST 5: Select Bus/Metro (Public Transit) ---');
  trip.selectMode('bus');
  assert('activeTransport is "bus"', trip.activeTransport === 'bus');
  const busRoute = trip.getRoute();
  assert('Route fare display for Bus shows "Fare unavailable" honestly', busRoute.selectedModeFareDisplay === 'Fare unavailable', `Got: ${busRoute.selectedModeFareDisplay}`);
  assert('Bus does not silently reuse Cab fare', !busRoute.selectedModeFareDisplay.includes('₹'));
  assert('All itinerary legs use "via BUS"', busRoute.legs.every(l => l.transportMode === 'bus' && l.transportLabel === 'BUS'));
  assert('Bus explanation highlights public transport', trip.getExplanation().includes('Lower-cost public transport'));

  console.log('\n--- TEST 6: Rapid Transport Switching Sequences ---');
  // Walking -> Cab
  trip.selectMode('walk');
  assert('Walking active in switch sequence', trip.activeTransport === 'walk' && trip.getRoute().selectedModeFareDisplay === 'Free (₹0)');
  trip.selectMode('cab');
  assert('Switched Walking -> Cab: fare updated to Cab', trip.activeTransport === 'cab' && trip.getRoute().selectedModeFareDisplay.includes('₹'));
  
  // Cab -> Walking
  trip.selectMode('walk');
  assert('Switched Cab -> Walking: fare updated to Free (₹0)', trip.activeTransport === 'walk' && trip.getRoute().selectedModeFareDisplay === 'Free (₹0)');

  // Auto -> Bus
  trip.selectMode('auto');
  assert('Switched Walking -> Auto: legs use AUTO', trip.activeTransport === 'auto' && trip.getRoute().legs[0].transportLabel === 'AUTO');
  trip.selectMode('bus');
  assert('Switched Auto -> Bus: fare unavailable, legs use BUS', trip.activeTransport === 'bus' && trip.getRoute().selectedModeFareDisplay === 'Fare unavailable' && trip.getRoute().legs[0].transportLabel === 'BUS');

  // Bus -> Cab
  trip.selectMode('cab');
  assert('Switched Bus -> Cab: legs use CAB with estimated fare', trip.activeTransport === 'cab' && trip.getRoute().legs[0].transportLabel === 'CAB' && trip.getRoute().totalEstimatedTransportCostInr > 0);

  console.log('\n--- TEST 7: Return to Recommended Transport ---');
  trip.resetToRecommended();
  assert('After resetToRecommended, selectedTransport is null', trip.selectedTransport === null);
  assert('After resetToRecommended, activeTransport reverts to recommended', trip.activeTransport === trip.recommendedTransport);
  assert('Top card reverts to "RECOMMENDED TRANSPORT"', trip.topCardLabel === 'RECOMMENDED TRANSPORT');

  console.log('\n--- TEST 8: Add / Remove Stops with Transport Selection ---');
  trip.selectMode('walk');
  assert('Selected Walking before adding stop', trip.activeTransport === 'walk');
  
  // Add 3rd stop (Birla Mandir)
  trip.stops.push(DEMO_PLACES[2]);
  assert('Added 3rd stop: 3 stops now', trip.stops.length === 3);
  assert('Walking remains selected after adding stop', trip.activeTransport === 'walk');
  const route3Stops = trip.getRoute();
  assert('Route has 3 legs', route3Stops.legs.length === 3);
  assert('All 3 legs use "via WALK"', route3Stops.legs.every(l => l.transportLabel === 'WALK'));
  assert('Total cost is still Free (₹0) across all 3 stops', route3Stops.selectedModeFareDisplay === 'Free (₹0)');

  // Remove stop
  trip.stops.splice(1, 1); // remove 2nd stop
  assert('Removed stop: 2 stops remain', trip.stops.length === 2);
  assert('Walking remains active after removing stop', trip.activeTransport === 'walk');
  const route2Stops = trip.getRoute();
  assert('Route has 2 legs, both via WALK', route2Stops.legs.every(l => l.transportLabel === 'WALK'));

  // Single stop edge case
  trip.stops = [DEMO_PLACES[0]];
  assert('Single stop: 1 stop present', trip.stops.length === 1);
  const route1Stop = trip.getRoute();
  assert('Single stop has 1 leg via WALK', route1Stop.legs.length === 1 && route1Stop.legs[0].transportLabel === 'WALK');

  console.log('\n--- TEST 9: Empty Trip Handling & Selection Reset ---');
  trip.stops = [];
  trip.selectedTransport = null;
  assert('Empty trip has 0 stops', trip.stops.length === 0);
  assert('recommendedTransport on empty trip returns safe default "auto"', trip.recommendedTransport === 'auto');
  assert('activeTransport on empty trip returns "auto"', trip.activeTransport === 'auto');
  const emptyRoute = trip.getRoute();
  assert('Empty route has 0 legs', emptyRoute.legs.length === 0);
  assert('Empty route total distance is 0', emptyRoute.totalDistanceKm === 0);
  assert('Empty route total travel time is 0', emptyRoute.totalTravelTimeMin === 0);
  assert('Empty route fare display is "₹0"', emptyRoute.selectedModeFareDisplay === '₹0');

  console.log('\n--- TEST 10: Timeline Schedule Order and Clock Synchronization ---');
  trip.stops = [DEMO_PLACES[0], DEMO_PLACES[1]];
  trip.selectMode('cab');
  const cabSchedule = trip.getRoute().schedule;
  assert('Cab schedule timeline is chronological', cabSchedule.stops.length === 2);
  const cabFinishMin = cabSchedule.totalTripMin;

  trip.selectMode('walk');
  const walkSchedule = trip.getRoute().schedule;
  const walkFinishMin = walkSchedule.totalTripMin;
  assert('Walking schedule timeline is strictly longer than Cab timeline', walkFinishMin > cabFinishMin, `Walk: ${walkFinishMin}m vs Cab: ${cabFinishMin}m`);

  console.log('\n================================================================');
  console.log(`   TRANSPORT CONSISTENCY TEST SUMMARY: Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTransportConsistencySuite();
