// Phase 9.4 Smart Transport Recommendation Automated Verification Suite
import { 
  recommendTransportMode, 
  recommendTripTransport 
} from './client/src/services/transportRecommendationService.ts';

const BASE_URL = 'http://localhost:5000/api';

async function runTestSuite() {
  console.log('================================================================');
  console.log('   PHASE 9.4 — SMART TRANSPORT RECOMMENDATION VERIFICATION     ');
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

  // TEST 1: Backend Health
  console.log('--- TEST 1: Backend Health & Status ---');
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    assert('Backend API is healthy', data.status === 'healthy');
  } catch (err) {
    assert('Backend connection failed', false, err.message);
  }

  // Default base preferences for testing
  const basePref = {
    interests: ['history', 'food'],
    availableHours: 4,
    budgetAmount: 1000,
    travelStyle: 'solo',
    pace: 'moderate',
    maxDistanceKm: null,
    minRating: null,
    openNowOnly: false,
    isConfigured: true,
  };

  // SCENARIO 1: Short distance + low budget
  console.log('\n--- SCENARIO 1: Short Distance + Low Budget (0.8 km, ₹500 budget) ---');
  {
    const pref1 = { ...basePref, budgetAmount: 500, availableHours: 4, pace: 'relaxed' };
    const res1 = recommendTransportMode({
      distanceKm: 0.8,
      preferences: pref1,
    });

    assert('Scenario 1: Walking is recommended for 0.8 km stroll', res1.recommended.mode === 'walk');
    assert('Scenario 1: Walking score is high (>= 85)', res1.recommended.score >= 85);
    assert('Scenario 1: Walking tagline mentions zero-cost / pedestrian', 
      res1.recommended.tagline.toLowerCase().includes('zero-cost') || res1.recommended.tagline.toLowerCase().includes('pedestrian'));
    assert('Scenario 1: Match reasons explain Free ₹0 and short distance', 
      res1.recommended.matchReasons.some(r => r.includes('Free') || r.includes('0.8 km')));
    assert('Scenario 1: Auto is listed in alternatives', res1.alternatives.some(a => a.mode === 'auto'));
    console.log(`     Recommended: ${res1.recommended.modeLabel} (Score: ${res1.recommended.score}/100) — "${res1.recommended.tagline}"`);
  }

  // SCENARIO 2: Long distance + limited time
  console.log('\n--- SCENARIO 2: Long Distance + Limited Time (18 km, 2h available, fast pace) ---');
  {
    const pref2 = { ...basePref, budgetAmount: 1000, availableHours: 2, pace: 'fast' };
    const res2 = recommendTransportMode({
      distanceKm: 18.0,
      preferences: pref2,
    });

    assert('Scenario 2: Motorized transport (Auto or Cab) is recommended', 
      res2.recommended.mode === 'auto' || res2.recommended.mode === 'cab');
    assert('Scenario 2: Walking is NOT recommended for 18 km with 2h time limit', 
      res2.recommended.mode !== 'walk');
    assert('Scenario 2: Match reasons mention saving significant travel time', 
      res2.recommended.matchReasons.some(r => r.includes('Saves') || r.includes('transit')));
    console.log(`     Recommended: ${res2.recommended.modeLabel} (Score: ${res2.recommended.score}/100) — "${res2.recommended.tagline}"`);
  }

  // SCENARIO 3: High budget + comfort preference (Family, ₹5000 budget, 12 km)
  console.log('\n--- SCENARIO 3: High Budget + Family Comfort (12 km, ₹5,000 budget, Family) ---');
  {
    const pref3 = { ...basePref, budgetAmount: 5000, availableHours: 4, travelStyle: 'family' };
    const res3 = recommendTransportMode({
      distanceKm: 12.0,
      preferences: pref3,
    });

    assert('Scenario 3: Cab is recommended for Family travel with high budget', res3.recommended.mode === 'cab');
    assert('Scenario 3: Cab score is high (>= 85)', res3.recommended.score >= 85);
    assert('Scenario 3: Match reasons mention family or comfortable ride', 
      res3.recommended.matchReasons.some(r => r.includes('family') || r.includes('comfort') || r.includes('private')));
    console.log(`     Recommended: ${res3.recommended.modeLabel} (Score: ${res3.recommended.score}/100) — "${res3.recommended.tagline}"`);
  }

  // SCENARIO 4: Budget-conscious preference (Solo, ₹500 budget, 4.0 km city route)
  console.log('\n--- SCENARIO 4: Budget-Conscious Preference (4.0 km, ₹500 budget, Solo) ---');
  {
    const pref4 = { ...basePref, budgetAmount: 500, availableHours: 4, travelStyle: 'solo' };
    const res4 = recommendTransportMode({
      distanceKm: 4.0,
      preferences: pref4,
    });

    assert('Scenario 4: Auto Rickshaw is recommended as best balance of time & budget', 
      res4.recommended.mode === 'auto');
    assert('Scenario 4: Tagline highlights best balance of time and budget', 
      res4.recommended.tagline.toLowerCase().includes('balance'));
    assert('Scenario 4: Match reasons state it fits the ₹500 budget and saves time vs walk', 
      res4.recommended.matchReasons.some(r => r.includes('500') && r.includes('budget')));
    console.log(`     Recommended: ${res4.recommended.modeLabel} (Score: ${res4.recommended.score}/100) — "${res4.recommended.tagline}"`);
  }

  // SCENARIO 5: Change User Preferences Dynamically Updates Recommendation
  console.log('\n--- SCENARIO 5: Dynamic Preference Updates ---');
  {
    // On same 10 km route:
    // With Solo + ₹500 budget -> Auto should score higher than Cab
    const resSolo = recommendTransportMode({
      distanceKm: 10.0,
      preferences: { ...basePref, budgetAmount: 500, travelStyle: 'solo' },
    });

    // With Family + ₹5000 budget -> Cab should score higher than Auto
    const resFamily = recommendTransportMode({
      distanceKm: 10.0,
      preferences: { ...basePref, budgetAmount: 5000, travelStyle: 'family' },
    });

    assert('Scenario 5: Changing preferences from Solo ₹500 to Family ₹5000 changes recommended mode', 
      resSolo.recommended.mode !== resFamily.recommended.mode);
    assert('Scenario 5: Solo ₹500 recommends Auto', resSolo.recommended.mode === 'auto');
    assert('Scenario 5: Family ₹5000 recommends Cab', resFamily.recommended.mode === 'cab');
    console.log(`     10 km Solo (₹500):   ${resSolo.recommended.modeLabel} (${resSolo.recommended.score}/100)`);
    console.log(`     10 km Family (₹5000): ${resFamily.recommended.modeLabel} (${resFamily.recommended.score}/100)`);
  }

  // SCENARIO 6: Change Route Distance Dynamically Updates Recommendation
  console.log('\n--- SCENARIO 6: Dynamic Route Distance Updates ---');
  {
    // Very short route (0.7 km)
    const resShort = recommendTransportMode({ distanceKm: 0.7, preferences: basePref });
    // Medium city route (5.0 km)
    const resMedium = recommendTransportMode({ distanceKm: 5.0, preferences: basePref });
    // Long intercity route (150 km)
    const resLong = recommendTransportMode({ distanceKm: 150.0, preferences: basePref });

    assert('Scenario 6: 0.7 km recommends Walking', resShort.recommended.mode === 'walk');
    assert('Scenario 6: 5.0 km recommends Auto', resMedium.recommended.mode === 'auto');
    assert('Scenario 6: 150.0 km recommends Cab (intercity highway)', resLong.recommended.mode === 'cab');
    console.log(`     0.7 km:   ${resShort.recommended.modeLabel} (${resShort.recommended.score}/100)`);
    console.log(`     5.0 km:   ${resMedium.recommended.modeLabel} (${resMedium.recommended.score}/100)`);
    console.log(`     150.0 km: ${resLong.recommended.modeLabel} (${resLong.recommended.score}/100)`);
  }

  // TEST 7: Multi-Stop Itinerary Trip Recommendation & Budget Impact
  console.log('\n--- TEST 7: Multi-Stop Trip Recommendation & Budget Impact ---');
  {
    const tripLegs = [
      { distanceKm: 551.4, roadDurationMin: 490 },
      { distanceKm: 10.2, roadDurationMin: 25 },
    ];

    const tripRes = recommendTripTransport(tripLegs, basePref);
    assert('Trip recommendation result is generated', !!tripRes.recommended);
    assert('Trip total distance is preserved (~561.6 km)', tripRes.recommended.distanceKm >= 560);
    assert('Budget impact has tripBudgetInr = ₹1,000', tripRes.budgetImpact.tripBudgetInr === 1000);
    assert('Budget impact tracks estimatedFareMinInr and MaxInr', 
      tripRes.budgetImpact.estimatedFareMinInr > 0 && tripRes.budgetImpact.estimatedFareMaxInr > tripRes.budgetImpact.estimatedFareMinInr);
    assert('Summary explanation contains factual figures', 
      tripRes.summaryExplanation.includes('km') && tripRes.summaryExplanation.includes('₹'));

    console.log(`     Multi-stop Trip (${tripRes.recommended.distanceKm} km): Recommended ${tripRes.recommended.modeLabel}`);
    console.log(`     Budget Impact: Trip Budget ₹${tripRes.budgetImpact.tripBudgetInr} | Estimated Fare ${tripRes.recommended.fareEstimate.fareDisplay}`);
    console.log(`     Summary: ${tripRes.summaryExplanation}`);
  }

  // TEST 8: Data Honesty & Unavailable Modes Exclusion
  console.log('\n--- TEST 8: Data Honesty & Unavailable Transport Exclusion ---');
  {
    const testRes = recommendTransportMode({ distanceKm: 8.0, preferences: basePref });
    
    // 10. Unavailable transport (Bus/Metro) is never recommended
    assert('Bus / Metro is NOT recommended', testRes.recommended.mode !== 'bus');
    assert('Bus / Metro is NOT in viable alternatives', !testRes.alternatives.some(a => a.mode === 'bus'));
    assert('Bus / Metro is strictly categorized in unavailableModes', 
      testRes.unavailableModes.some(u => u.mode === 'bus' && u.role === 'unavailable'));

    // Check forbidden claims
    const forbidden = ['live fare', 'exact fare', 'current ola/uber price', 'ai recommends this'];
    const allText = [
      testRes.recommended.tagline,
      ...testRes.recommended.matchReasons,
      testRes.summaryExplanation
    ].join(' ').toLowerCase();

    let foundForbidden = false;
    for (const term of forbidden) {
      if (allText.includes(term)) {
        foundForbidden = true;
        console.error(`Forbidden text found: "${term}"`);
      }
    }
    assert('Zero forbidden claims in recommendation and explanations', !foundForbidden);
  }

  // TEST 9: Phase 7 Recommendations & Place Filters Preservation
  console.log('\n--- TEST 9: Phase 7 Place Recommendations & Filter Preservation ---');
  try {
    const placesRes = await fetch(`${BASE_URL}/places?lat=17.3616&lon=78.4747&radius=10000`);
    const placesData = await placesRes.json();
    assert('Places API returns places array', Array.isArray(placesData.places) && placesData.places.length > 0);
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
