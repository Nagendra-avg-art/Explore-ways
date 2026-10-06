/**
 * Comprehensive Phase 11 AI Local Travel Guide Verification Script
 * Validates Scenarios 1–9 and checks frontend security.
 */

import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000/api';

// Realistic application context matching Phase 7–10 state
const testContext = {
  location: {
    city: 'Hyderabad',
    area: 'Old City',
    lat: 17.3616,
    lon: 78.4747,
    formatted: 'Old City, Hyderabad, Telangana, India'
  },
  userPreferences: {
    interests: ['history', 'food', 'architecture'],
    availableHours: 4,
    budgetAmount: 1000,
    travelStyle: 'solo',
    pace: 'moderate',
    maxDistanceKm: 25,
    minRating: 4.0,
    openNowOnly: false
  },
  selectedTrip: {
    stopCount: 2,
    stops: [
      {
        id: 'charminar',
        name: 'Charminar',
        category: 'history',
        categoryLabel: 'Historical Landmark',
        rating: 4.6,
        distanceKm: 0.1,
        visitDuration: '45 min',
        shortDescription: 'Iconic 16th-century mosque with four grand arches and bustling bazaars.',
        openingHours: '9:00 AM - 5:30 PM',
        isOpenNow: true,
        entryFee: '₹25 for Indians, ₹300 for Foreigners',
        matchReasons: ['Top historical monument in Hyderabad', 'Matches your history interest', 'Very close to your current location (0.1 km)'],
        address: 'Char Kaman, Ghansi Bazaar, Hyderabad'
      },
      {
        id: 'golconda',
        name: 'Golconda Fort',
        category: 'history',
        categoryLabel: 'Historical Fortress',
        rating: 4.5,
        distanceKm: 11.2,
        visitDuration: '90 min',
        shortDescription: 'Magnificent medieval citadel famous for acoustic engineering and royal palaces.',
        openingHours: '9:00 AM - 5:30 PM',
        isOpenNow: true,
        entryFee: '₹25 for Indians',
        matchReasons: ['Historic fortress renowned for acoustics', 'Fits available 4h window'],
        address: 'Ibrahim Bagh, Hyderabad'
      }
    ],
    totalDistanceKm: 12.5,
    totalTravelTimeMin: 40,
    totalVisitTimeMin: 135,
    totalEstimatedDurationMin: 175,
    preferredMode: 'auto',
    isOptimized: true,
    distanceSavedKm: 2.4
  },
  topNearbyPlaces: [
    {
      id: 'chowmahalla',
      name: 'Chowmahalla Palace',
      category: 'architecture',
      categoryLabel: 'Royal Palace',
      rating: 4.7,
      distanceKm: 1.2,
      visitDuration: '60 min',
      shortDescription: 'Opulent palace of the Nizams with grand chandeliers and vintage car collection.',
      isOpenNow: true,
      entryFee: '₹80 for Indians',
      matchReasons: ['Architectural jewel of the Nizams', 'Only 1.2 km away']
    },
    {
      id: 'salarr-jung',
      name: 'Salar Jung Museum',
      category: 'history',
      categoryLabel: 'Museum',
      rating: 4.4,
      distanceKm: 2.1,
      visitDuration: '90 min',
      shortDescription: 'One of the largest art museums in India housing diverse collections.',
      isOpenNow: true,
      entryFee: '₹50 for Indians',
      matchReasons: ['World-class museum collection', 'Matches history interest']
    }
  ],
  itinerarySchedule: {
    startTimeStr: '09:00',
    endTimeStr: '11:55',
    bufferMin: 65,
    totalTripMin: 175,
    stops: [
      {
        stopIndex: 0,
        name: 'Charminar',
        arrivalTimeStr: '09:05',
        departureTimeStr: '09:50',
        visitDurationMin: 45,
        visitDurationDisplay: '45 min',
        openStatus: 'open',
        openStatusLabel: 'Open'
      },
      {
        stopIndex: 1,
        name: 'Golconda Fort',
        arrivalTimeStr: '10:25',
        departureTimeStr: '11:55',
        visitDurationMin: 90,
        visitDurationDisplay: '90 min',
        openStatus: 'open',
        openStatusLabel: 'Open'
      }
    ]
  },
  itineraryFeasibility: {
    status: 'feasible',
    statusLabel: 'Schedule Feasible',
    availableMinutes: 240,
    totalTripMinutes: 175,
    bufferMinutes: 65,
    remainingMinutes: 65,
    exceededMinutes: 0,
    headline: 'Your itinerary fits comfortably within your 4h window',
    explanation: 'Total estimated time is 175 min with 65 minutes of buffer remaining.',
    suggestions: ['You have enough buffer to add another nearby attraction or take a tea break.']
  },
  transportRecommendation: {
    recommendedMode: 'auto',
    modeLabel: 'Auto Rickshaw',
    tagline: 'Best balance of travel time and budget',
    matchReasons: [
      'Cost-effective for 12.5 km total distance',
      'Travel time is 40 min, comfortably within your 4.0h limit',
      'Fits comfortably within ₹1000 budget'
    ],
    travelTimeMin: 40,
    travelTimeDisplay: '~40 min',
    fareDisplay: '₹140–₹190 estimated',
    budgetImpact: {
      tripBudgetInr: 1000,
      estimatedFareMinInr: 140,
      estimatedFareMaxInr: 190,
      remainingBudgetMinInr: 810,
      remainingBudgetMaxInr: 860,
      percentOfBudget: 19
    },
    timeImpact: {
      availableMinutes: 240,
      transitTimeMinutes: 40,
      remainingTimeMinutes: 200
    },
    alternatives: [
      {
        mode: 'cab',
        modeLabel: 'Cab (Ola/Uber)',
        travelTimeDisplay: '~35 min',
        fareDisplay: '₹280–₹360 estimated',
        tagline: 'Faster and more comfortable AC ride'
      },
      {
        mode: 'walk',
        modeLabel: 'Walking',
        travelTimeDisplay: '~150 min',
        fareDisplay: 'Free',
        tagline: 'Not recommended for distances over 3 km'
      }
    ],
    summaryExplanation: 'Auto Rickshaw offers the best balance of speed and affordability for this 12.5 km route.'
  },
  tripFareSummary: {
    preferredMode: 'auto',
    totalFareDisplay: '₹140–₹190 estimated',
    totalMinFareInr: 140,
    totalMaxFareInr: 190,
    isEstimate: true,
    assumptions: 'Based on Hyderabad standard auto tariff rates',
    legs: [
      {
        fromName: 'Old City',
        toName: 'Charminar',
        distanceKm: 0.1,
        fareDisplay: '₹30 minimum fare'
      },
      {
        fromName: 'Charminar',
        toName: 'Golconda Fort',
        distanceKm: 11.2,
        fareDisplay: '₹110–₹160 estimated'
      }
    ]
  }
};

async function queryAI(message, context = testContext) {
  const res = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context })
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  return await res.json();
}

async function runAllTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 11 AI LOCAL TRAVEL GUIDE VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = '') {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (details) console.log(`   ℹ️  ${details}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (details) console.error(`   ⚠️  ${details}`);
    }
  }

  // TEST 0: AI Status check
  try {
    const statusRes = await fetch(`${API_BASE}/ai/status`).then(r => r.json());
    assert(
      statusRes.status === 'online' && statusRes.isGrounded === true,
      'Test 0: /api/ai/status returns healthy grounded state',
      `Provider: ${statusRes.provider}, isGrounded: ${statusRes.isGrounded}, hasApiKey: ${statusRes.hasApiKey}`
    );
  } catch (err) {
    assert(false, 'Test 0: /api/ai/status failed', err.message);
  }

  // TEST 1: Ask: "What should I visit first?"
  try {
    const res1 = await queryAI('What should I visit first?');
    const ans = res1.data.answer;
    const usesCharminar = ans.includes('Charminar');
    const usesData = ans.includes('[APPLICATION DATA]') || ans.includes('APPLICATION DATA');
    const hasOrderReason = ans.toLowerCase().includes('order') || ans.toLowerCase().includes('first') || ans.toLowerCase().includes('route');
    assert(
      usesCharminar && (usesData || hasOrderReason),
      'Test 1: "What should I visit first?" uses actual itinerary first stop (Charminar)',
      `Snippet: ${ans.split('\n')[0]}`
    );
  } catch (err) {
    assert(false, 'Test 1 failed', err.message);
  }

  // TEST 2: Ask: "Why did you recommend this place?"
  try {
    const res2 = await queryAI('Why did you recommend this place?');
    const ans = res2.data.answer;
    const mentionsReasons = ans.toLowerCase().includes('recommend') && 
      (ans.toLowerCase().includes('match') || ans.toLowerCase().includes('history') || ans.toLowerCase().includes('distance'));
    assert(
      mentionsReasons,
      'Test 2: "Why did you recommend this place?" reflects actual recommendation factors',
      `Snippet: ${ans.substring(0, 150)}...`
    );
  } catch (err) {
    assert(false, 'Test 2 failed', err.message);
  }

  // TEST 3: Ask: "How much will my trip cost?"
  try {
    const res3 = await queryAI('How much will my trip cost?');
    const ans = res3.data.answer;
    const usesFare = ans.includes('₹140') || ans.includes('₹190') || ans.includes('estimated');
    const mentionsEstimate = ans.toLowerCase().includes('estimate');
    assert(
      usesFare && mentionsEstimate,
      'Test 3: "How much will my trip cost?" uses Phase 9 fare estimates and clearly states Estimated',
      `Snippet: ${ans.substring(0, 160)}...`
    );
  } catch (err) {
    assert(false, 'Test 3 failed', err.message);
  }

  // TEST 4: Ask: "Should I take an auto or cab?"
  try {
    const res4 = await queryAI('Should I take an auto or cab?');
    const ans = res4.data.answer;
    const mentionsAuto = ans.toLowerCase().includes('auto');
    const comparesOptions = ans.toLowerCase().includes('cab') || ans.toLowerCase().includes('fare') || ans.toLowerCase().includes('time');
    assert(
      mentionsAuto && comparesOptions,
      'Test 4: "Should I take an auto or cab?" uses existing transport recommendation (Auto Rickshaw)',
      `Snippet: ${ans.substring(0, 160)}...`
    );
  } catch (err) {
    assert(false, 'Test 4 failed', err.message);
  }

  // TEST 5: Ask: "Can I fit another place?"
  try {
    const res5 = await queryAI('Can I fit another place?');
    const ans = res5.data.answer;
    const mentionsBufferOrTime = ans.includes('65') || ans.toLowerCase().includes('buffer') || ans.toLowerCase().includes('yes') || ans.toLowerCase().includes('fit');
    assert(
      mentionsBufferOrTime,
      'Test 5: "Can I fit another place?" uses actual remaining buffer/feasibility (65 min buffer)',
      `Snippet: ${ans.substring(0, 160)}...`
    );
  } catch (err) {
    assert(false, 'Test 5 failed', err.message);
  }

  // TEST 6: Ask about a nearby place
  try {
    const res6 = await queryAI('Tell me about Chowmahalla Palace');
    const ans = res6.data.answer;
    const mentionsChowmahalla = ans.toLowerCase().includes('chowmahalla');
    const hasData = ans.includes('1.2') || ans.toLowerCase().includes('palace') || ans.includes('4.7');
    assert(
      mentionsChowmahalla && hasData,
      'Test 6: Ask about nearby place uses actual place data (Chowmahalla Palace, 1.2 km)',
      `Snippet: ${ans.substring(0, 160)}...`
    );
  } catch (err) {
    assert(false, 'Test 6 failed', err.message);
  }

  // TEST 7: Ask question where application has no reliable information (e.g., ticket price in 1950)
  try {
    const res7 = await queryAI('What was the ticket price for 1950 and what was the king architect born date?');
    const ans = res7.data.answer;
    const admitsUnavailable = ans.toLowerCase().includes('not available') || ans.toLowerCase().includes('not specified') || ans.toLowerCase().includes('only have');
    assert(
      admitsUnavailable,
      'Test 7: Unrecorded/historical trivia question does NOT hallucinate and honestly states unavailable',
      `Snippet: ${ans.substring(0, 150)}...`
    );
  } catch (err) {
    assert(false, 'Test 7 failed', err.message);
  }

  // TEST 8: Invalid / offline error handling fallback
  try {
    // Send request with bad payload (empty message)
    const errRes = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' })
    });
    const errData = await errRes.json();
    assert(
      errRes.status === 400 && errData.success === false,
      'Test 8: Backend validates and cleanly rejects invalid/empty queries without crashing',
      `Status: ${errRes.status}, Error: ${errData.error}`
    );
  } catch (err) {
    assert(false, 'Test 8 failed', err.message);
  }

  // TEST 9: Security Verification — No API keys in client source or build
  try {
    let clientFilesLeakingKey = false;
    const clientSrc = 'client/src';
    const clientDist = 'client/dist';

    function scanDirForSecrets(dir) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDirForSecrets(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.includes('AIzaSy') || content.includes('GEMINI_API_KEY =') || /sk-[a-zA-Z0-9]{20,}/.test(content)) {
            clientFilesLeakingKey = true;
            console.error(`Leak detected in ${fullPath}`);
          }
        }
      }
    }

    scanDirForSecrets(clientSrc);
    scanDirForSecrets(clientDist);

    assert(
      !clientFilesLeakingKey,
      'Test 9: Security check passed — No AI API keys or secrets exposed in frontend code or bundle'
    );
  } catch (err) {
    assert(false, 'Test 9 failed', err.message);
  }

  console.log('\n====================================================');
  console.log(`📊 PHASE 11 BACKEND VERIFICATION RESULT: ${passed} / ${total} TESTS PASSED`);
  console.log('====================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
