// tests/phase/phase-13/test-phase13.mjs
// Comprehensive Verification Suite for Phase 13 - Weather-Aware Travel Intelligence

import { 
  classifyPlaceEnvironment, 
  calculateWeatherTripImpact,
  calculatePlaceWeatherSuitability 
} from '../../../client/src/services/weatherImpactService.ts';
import { calculateTripRoute } from '../../../client/src/services/routingService.ts';
import { calculateItinerarySchedule } from '../../../client/src/services/itineraryEngineService.ts';
import { rankPlacesForUser, scorePlace } from '../../../client/src/services/recommendationEngine.ts';
import { DEMO_PLACES } from '../../../client/src/data/demoPlaces.ts';

const BASE_URL = 'http://localhost:5000';

// Mock weather datasets for deterministic test scenarios
function createMockWeather({
  location = 'Hyderabad',
  lat = 17.3850,
  lon = 78.4867,
  temp = 28,
  condition = 'Clear Sky',
  conditionType = 'clear',
  rainProb = 0,
  hourlyRainAt13 = 10,
  hourlyTempAt14 = 30,
  hourlyRainType = 'clear'
} = {}) {
  const hourly = [];
  for (let h = 0; h < 24; h++) {
    const timeStr = `${String(h).padStart(2, '0')}:00`;
    let isRainTime = h >= 12 && h <= 14;
    let prob = isRainTime ? hourlyRainAt13 : rainProb;
    let type = isRainTime ? hourlyRainType : conditionType;
    let t = (h >= 13 && h <= 15) ? hourlyTempAt14 : temp;

    hourly.push({
      time: timeStr,
      isoTime: `2026-10-07T${timeStr}:00.000Z`,
      hour: h,
      temperature: t,
      feelsLike: t + 1,
      precipitationProbability: prob,
      precipitationMm: prob > 50 ? 5 : 0,
      windSpeedKmh: 10,
      condition: type === 'rain' ? 'Rain showers' : (type === 'thunderstorm' ? 'Thunderstorm' : 'Clear Sky'),
      conditionType: type,
      icon: type === 'rain' ? '🌧️' : '☀️'
    });
  }

  return {
    location: { lat, lon, city: location },
    latitude: lat,
    longitude: lon,
    timezone: 'Asia/Kolkata',
    current: {
      temperature: temp,
      feelsLike: temp + 1,
      condition,
      conditionType,
      icon: '🌤️',
      precipitationMm: 0,
      precipitationProbability: rainProb,
      windSpeedKmh: 10,
      humidity: 55,
      isDay: true
    },
    hourlyForecast: hourly,
    dailyForecast: [
      {
        date: '2026-10-07',
        tempMin: 22,
        tempMax: temp + 4,
        condition,
        conditionType,
        icon: '🌤️',
        precipitationProbability: rainProb
      }
    ],
    fetchedAt: new Date().toISOString(),
    provider: 'Open-Meteo Weather API'
  };
}

// Sample places
const outdoorTemple = {
  id: 'place-temple-outdoor',
  name: 'Sri Venkateswara Temple Outer Complex',
  category: 'temples',
  categoryLabel: '🛕 Temples',
  tags: ['temple', 'outdoor', 'park', 'sightseeing'],
  lat: 17.3650,
  lon: 78.4750,
  rating: 4.8,
  reviewCount: 1200,
  distanceKm: 2.5,
  travelTimeMin: 10,
  visitDuration: '1–2 hrs',
  imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa',
  shortDescription: 'Grand hilltop temple with vast open stone walkways and courtyards.',
  whyRecommended: 'Sacred architectural landmark with panoramic hill views.',
  openingHours: '06:00 - 20:00'
};

const indoorMuseum = {
  id: 'place-museum-indoor',
  name: 'Salar Jung Museum',
  category: 'history',
  categoryLabel: '🏛️ History & Museum',
  tags: ['museum', 'indoor', 'art', 'history'],
  lat: 17.3713,
  lon: 78.4804,
  rating: 4.7,
  reviewCount: 3400,
  distanceKm: 4.0,
  travelTimeMin: 15,
  visitDuration: '2–3 hrs',
  imageUrl: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c',
  shortDescription: 'National art museum housed in an enclosed climate-controlled building.',
  whyRecommended: 'Unmatched art collections and royal relics in cool indoor comfort.',
  openingHours: '10:00 - 17:00'
};

const indoorRestaurant = {
  id: 'place-restaurant-indoor',
  name: 'Bawarchi Restaurant',
  category: 'food',
  categoryLabel: '🍴 Local Food',
  tags: ['restaurant', 'food', 'indoor'],
  lat: 17.4014,
  lon: 78.4975,
  rating: 4.5,
  reviewCount: 5200,
  distanceKm: 3.2,
  travelTimeMin: 12,
  visitDuration: '1 hr',
  imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
  shortDescription: 'Famous indoor multi-story family restaurant.',
  whyRecommended: 'Authentic Hyderabadi biryani and regional delicacies.',
  openingHours: '11:00 - 23:00'
};

const mixedHistoricalComplex = {
  id: 'place-mixed-complex',
  name: 'Golconda Fort Complex',
  category: 'history',
  categoryLabel: '🏰 Medieval Citadel',
  tags: ['historical', 'monument', 'architecture'],
  lat: 17.3833,
  lon: 78.4011,
  rating: 4.6,
  reviewCount: 4100,
  distanceKm: 8.0,
  travelTimeMin: 25,
  visitDuration: '2–3 hrs',
  imageUrl: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220',
  shortDescription: 'Historic fortress with indoor royal armory and vast open ramparts.',
  whyRecommended: 'Panoramic vistas and world-famous acoustics.',
  openingHours: '09:00 - 17:30'
};

async function runPhase13Suite() {
  console.log('================================================================');
  console.log('   PHASE 13: WEATHER-AWARE TRAVEL INTELLIGENCE VERIFICATION    ');
  console.log('================================================================\n');

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failCount++;
    }
  }

  // ============================================================
  // SECTION 1: LIVE BACKEND WEATHER ENDPOINT & COORDINATE CACHING
  // ============================================================
  console.log('--- TEST GROUP 1: Live Backend Weather API & Coordinate Caching ---');
  try {
    // Tirupati
    const resTirupati = await fetch(`${BASE_URL}/api/weather?lat=13.6288&lon=79.4192&city=Tirupati`);
    const dataTirupati = await resTirupati.json();
    assert(resTirupati.ok && dataTirupati.success, 'GET /api/weather for Tirupati returns HTTP 200 and success: true');
    assert(dataTirupati.weather?.location?.city === 'Tirupati', `Tirupati response location matches "${dataTirupati.weather?.location?.city}"`);
    assert(typeof dataTirupati.weather?.current?.temperature === 'number', `Current temperature is numeric (${dataTirupati.weather?.current?.temperature}°C)`);
    assert(Array.isArray(dataTirupati.weather?.hourlyForecast) && dataTirupati.weather.hourlyForecast.length >= 24, 'Hourly forecast contains at least 24 hours');
    assert(dataTirupati.weather?.provider === 'Open-Meteo Weather API', 'Provider abstraction correctly specifies Open-Meteo');

    // Rajahmundry
    const resRajah = await fetch(`${BASE_URL}/api/weather?lat=17.0005&lon=81.8040&city=Rajahmundry`);
    const dataRajah = await resRajah.json();
    assert(resRajah.ok && dataRajah.weather?.location?.city === 'Rajahmundry', 'GET /api/weather updates location to Rajahmundry');
    assert(dataRajah.weather?.latitude === 17.0005, 'Rajahmundry latitude coordinates match requested location');

    // Hyderabad
    const resHyd = await fetch(`${BASE_URL}/api/weather?lat=17.3850&lon=78.4867&city=Hyderabad`);
    const dataHyd = await resHyd.json();
    assert(resHyd.ok && dataHyd.weather?.location?.city === 'Hyderabad', 'GET /api/weather updates location to Hyderabad');

    // Return to Tirupati (Cache Verification)
    const t0 = Date.now();
    const resTirupati2 = await fetch(`${BASE_URL}/api/weather?lat=13.6288&lon=79.4192&city=Tirupati`);
    const t1 = Date.now();
    const dataTirupati2 = await resTirupati2.json();
    assert(resTirupati2.ok && dataTirupati2.weather?.location?.city === 'Tirupati', 'Return to Tirupati fetches Tirupati weather correctly');
    assert((t1 - t0) < 100, `Cached response returned in ${(t1 - t0)}ms (<100ms in-memory cache hit)`);
    assert(dataTirupati2.weather?.latitude === 13.6288, 'Cached coordinates accurately match Tirupati');
  } catch (err) {
    console.error('Error testing backend weather API:', err);
    failCount++;
  }

  // ============================================================
  // SECTION 2: PLACE CLASSIFICATION (OUTDOOR, INDOOR, MIXED)
  // ============================================================
  console.log('\n--- TEST GROUP 2: Place Classification Engine ---');
  assert(classifyPlaceEnvironment(outdoorTemple) === 'outdoor', 'Outdoor temple correctly classified as OUTDOOR');
  assert(classifyPlaceEnvironment(indoorMuseum) === 'indoor', 'Museum correctly classified as INDOOR');
  assert(classifyPlaceEnvironment(indoorRestaurant) === 'indoor', 'Restaurant correctly classified as INDOOR');
  assert(classifyPlaceEnvironment(mixedHistoricalComplex) === 'mixed', 'Historical fort complex correctly classified as MIXED');
  assert(classifyPlaceEnvironment({ id: 'x', name: 'Unknown Place' }) === 'mixed', 'Unknown / ambiguous category defaults to MIXED');

  // Helper origin
  const testOrigin = {
    label: 'Origin Location',
    lat: 17.3850,
    lon: 78.4867,
    isActualGps: false
  };

  // ============================================================
  // SECTION 3: DETERMINISTIC WEATHER IMPACT ENGINE SCENARIOS
  // ============================================================
  console.log('\n--- TEST GROUP 3: Weather Impact Engine Core Scenarios ---');

  // Scenario 1: Clear weather + Outdoor place
  {
    const clearWeather = createMockWeather({ rainProb: 0, hourlyRainAt13: 5, hourlyRainType: 'clear' });
    const stops = [outdoorTemple];
    const route = calculateTripRoute(testOrigin, stops, false, 0, 'cab');
    const sched = calculateItinerarySchedule(stops, route.legs, '13:00', 'moderate');
    const impact = calculateWeatherTripImpact(clearWeather, stops, sched, 'cab', route.legs);

    assert(impact.overallSeverity === 'LOW', 'Scenario 1 (Clear weather + Outdoor): Overall severity is LOW');
    assert(!impact.hasWeatherAlert, 'Scenario 1: hasWeatherAlert is false');
    assert(impact.summary.includes('favorable') || impact.summary.includes('Favorable') || impact.summary.includes('comfortable'), 'Scenario 1: Summary confirms favorable weather');
  }

  // Scenario 2: Rain + Outdoor place scheduled at 13:00
  {
    const rainWeather = createMockWeather({ hourlyRainAt13: 65, hourlyRainType: 'rain' });
    const stops = [outdoorTemple];
    const route = calculateTripRoute(testOrigin, stops, false, 0, 'cab');
    const sched = calculateItinerarySchedule(stops, route.legs, '13:00', 'moderate');
    const impact = calculateWeatherTripImpact(rainWeather, stops, sched, 'cab', route.legs);

    assert(impact.overallSeverity === 'HIGH', 'Scenario 2 (Rain + Outdoor at 13:00): Overall severity is HIGH');
    assert(impact.hasWeatherAlert === true, 'Scenario 2: hasWeatherAlert is true');
    assert(impact.impactItems.some(i => i.type === 'RAIN' && i.affectedStopId === outdoorTemple.id), 'Scenario 2: Impact item targets outdoor temple');
    assert(impact.impactItems[0].suggestion.toLowerCase().includes('earlier') || impact.impactItems[0].suggestion.toLowerCase().includes('rain'), 'Scenario 2: Suggests visiting earlier or rain protection');
  }

  // Scenario 3: Rain + Indoor place scheduled at 13:00
  {
    const rainWeather = createMockWeather({ hourlyRainAt13: 65, hourlyRainType: 'rain' });
    const stops = [indoorMuseum];
    const route = calculateTripRoute(testOrigin, stops, false, 0, 'cab');
    const sched = calculateItinerarySchedule(stops, route.legs, '13:00', 'moderate');
    const impact = calculateWeatherTripImpact(rainWeather, stops, sched, 'cab', route.legs);

    assert(impact.overallSeverity === 'LOW', 'Scenario 3 (Rain + Indoor): Overall severity is LOW');
    assert(!impact.hasWeatherAlert, 'Scenario 3: No weather alert triggered for indoor museum during rain');
    assert(impact.impactItems.some(i => i.outdoorClassification === 'indoor' && i.reason.includes('indoor venue')), 'Scenario 3: Acknowledges indoor museum as safe venue during rain');
  }

  // Scenario 4: Rain during Walking leg (Walking selected)
  {
    const rainWeather = createMockWeather({ hourlyRainAt13: 65, hourlyRainType: 'rain' });
    const stops = [outdoorTemple, indoorRestaurant];
    const route = calculateTripRoute(testOrigin, stops, false, 0, 'walk');
    const sched = calculateItinerarySchedule(stops, route.legs, '13:00', 'moderate');
    const impact = calculateWeatherTripImpact(rainWeather, stops, sched, 'walk', route.legs);

    assert(impact.alternativeTransportSuggestion !== undefined, 'Scenario 4 (Rain during walking): Alternative transport suggested');
    assert(impact.alternativeTransportSuggestion?.toMode === 'cab', 'Scenario 4: Suggests switching to Cab');
    assert(impact.alternativeTransportSuggestion?.reason.toLowerCase().includes('walking may be uncomfortable') || 
           impact.alternativeTransportSuggestion?.reason.toLowerCase().includes('rain'), 'Scenario 4: Clear reasoning provided for transport switch');
  }

  // Scenario 5: Rain during Cab leg (Cab already selected)
  {
    const rainWeather = createMockWeather({ hourlyRainAt13: 65, hourlyRainType: 'rain' });
    const stops = [indoorMuseum, indoorRestaurant];
    const route = calculateTripRoute(testOrigin, stops, false, 0, 'cab');
    const sched = calculateItinerarySchedule(stops, route.legs, '13:00', 'moderate');
    const impact = calculateWeatherTripImpact(rainWeather, stops, sched, 'cab', route.legs);

    assert(impact.alternativeTransportSuggestion === undefined, 'Scenario 5 (Rain during Cab): Does not recommend switching from Cab');
  }

  // Scenario 6: High temperature + Long walking leg
  {
    const heatWeather = createMockWeather({ temp: 39, hourlyTempAt14: 39, hourlyRainAt13: 0, hourlyRainType: 'clear' });
    const stops = [outdoorTemple, mixedHistoricalComplex];
    const route = calculateTripRoute(testOrigin, stops, false, 0, 'walk');
    const sched = calculateItinerarySchedule(stops, route.legs, '13:00', 'moderate');
    const impact = calculateWeatherTripImpact(heatWeather, stops, sched, 'walk', route.legs);

    assert(impact.hasWeatherAlert === true, 'Scenario 6 (High temp + walking): Weather alert triggered');
    assert(impact.impactItems.some(i => i.type === 'HEAT'), 'Scenario 6: Heat impact recorded');
    assert(impact.alternativeTransportSuggestion?.toMode === 'auto' || impact.alternativeTransportSuggestion?.toMode === 'cab', 'Scenario 6: Motorized transport suggested to mitigate heat');
  }

  // Scenario 7: Weather unavailable / null handling
  {
    const stops = [outdoorTemple];
    const route = calculateTripRoute(testOrigin, stops, false, 0, 'cab');
    const sched = calculateItinerarySchedule(stops, route.legs, '13:00', 'moderate');
    const impact = calculateWeatherTripImpact(null, stops, sched, 'cab', route.legs);

    assert(impact.overallSeverity === 'LOW', 'Scenario 7 (Weather null): Gracefully falls back to LOW severity');
    assert(!impact.hasWeatherAlert, 'Scenario 7: No false alerts when weather is null');
    assert(impact.summary.toLowerCase().includes('unavailable'), 'Scenario 7: Honest unavailable message');
  }

  // ============================================================
  // SECTION 4: USER CONTROL OVER ITINERARY REORDERING
  // ============================================================
  console.log('\n--- TEST GROUP 4: Strict User Control Over Weather Suggestions ---');
  {
    // User plan: 13:00 Outdoor Temple -> 15:00 Indoor Museum
    // Rain is heavy between 12:00-14:00 (hour 13 = 85%), then drops.
    // The engine suggests: Indoor Museum -> Outdoor Temple
    const rainWeather = createMockWeather({ hourlyRainAt13: 85, hourlyRainType: 'rain' });
    const currentStops = [outdoorTemple, indoorMuseum];
    const route = calculateTripRoute(testOrigin, currentStops, false, 0, 'cab');
    const sched = calculateItinerarySchedule(currentStops, route.legs, '13:00', 'moderate');
    const impact = calculateWeatherTripImpact(rainWeather, currentStops, sched, 'cab', route.legs);

    assert(impact.isAlternativeOrderDifferent === true, 'Alternative weather-optimized order detected as different');
    assert(impact.suggestedStopOrder?.[0] === indoorMuseum.id, 'Weather suggestion puts indoor museum first to avoid rain at outdoor temple');
    
    // VERIFICATION: Current stops list MUST REMAIN UNCHANGED by the impact engine calculation
    assert(currentStops[0].id === outdoorTemple.id, 'CRITICAL: Current plan was NOT silently rewritten by weather engine');
    assert(currentStops[1].id === indoorMuseum.id, 'CRITICAL: Current plan stop 2 remains museum');
  }

  // ============================================================
  // SECTION 5: RECOMMENDATION ENGINE INTEGRATION
  // ============================================================
  console.log('\n--- TEST GROUP 5: Recommendation Engine Weather Suitability ---');
  {
    const rainyWeather = createMockWeather({ rainProb: 80, hourlyRainAt13: 85, hourlyRainType: 'rain' });
    const clearWeather = createMockWeather({ rainProb: 0, hourlyRainAt13: 5, hourlyRainType: 'clear' });

    const outdoorScoreRain = calculatePlaceWeatherSuitability(outdoorTemple, rainyWeather);
    const indoorScoreRain = calculatePlaceWeatherSuitability(indoorMuseum, rainyWeather);
    const outdoorScoreClear = calculatePlaceWeatherSuitability(outdoorTemple, clearWeather);

    assert(outdoorScoreRain.scoreModifier < 0, `Outdoor place in heavy rain gets negative weather modifier (${outdoorScoreRain.scoreModifier})`);
    assert(indoorScoreRain.scoreModifier > 0, `Indoor museum in rain gets positive weather modifier (${indoorScoreRain.scoreModifier})`);
    assert(outdoorScoreClear.scoreModifier === 0 || outdoorScoreClear.scoreModifier > 0, `Outdoor place in clear weather gets non-negative weather modifier (${outdoorScoreClear.scoreModifier})`);

    // Verify recommendations scoring includes weather
    const userPref = {
      interests: ['temples', 'history', 'food'],
      availableHours: 4,
      budgetAmount: 1000,
      travelStyle: 'solo',
      pace: 'moderate',
      isConfigured: true
    };

    const scoredOutdoorRain = scorePlace(outdoorTemple, 17.3850, 78.4867, userPref, rainyWeather);
    const scoredOutdoorClear = scorePlace(outdoorTemple, 17.3850, 78.4867, userPref, clearWeather);

    assert(scoredOutdoorClear.matchScore > scoredOutdoorRain.matchScore, 
      `Total score for outdoor place is higher in clear weather (${scoredOutdoorClear.matchScore.toFixed(1)}) than rain (${scoredOutdoorRain.matchScore.toFixed(1)})`);
  }

  // ============================================================
  // SECTION 6: AI TRAVEL GUIDE GROUNDED WEATHER RESPONSES
  // ============================================================
  console.log('\n--- TEST GROUP 6: AI Travel Guide Grounded Weather Q&A ---');
  try {
    const aiPayloadWithWeather = {
      message: 'Will it rain during my trip today and should I walk?',
      context: {
        currentLocation: { lat: 17.3850, lng: 78.4867, name: 'Hyderabad' },
        itinerary: [
          { place: outdoorTemple, arrivalTime: '13:00', durationMinutes: 60 }
        ],
        activeTransport: 'walk',
        weather: {
          location: 'Hyderabad',
          current: {
            temperature: 28,
            condition: 'Thunderstorm',
            precipitationProbability: 80
          },
          summary: 'Thunderstorm expected with 80% rain probability around 13:00.',
          overallSeverity: 'HIGH',
          hasWeatherAlert: true,
          hourlyForecast: [
            { timeDisplay: '13:00', precipitationProbability: 80, condition: 'Thunderstorm', temperature: 27 },
            { timeDisplay: '14:00', precipitationProbability: 75, condition: 'Rain', temperature: 26 }
          ],
          alternativeTransportSuggestion: {
            fromMode: 'walk',
            toMode: 'cab',
            reason: 'Heavy rain makes walking uncomfortable. Cab is recommended.'
          }
        }
      }
    };

    const resAI = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiPayloadWithWeather)
    });
    const dataAI = await resAI.json();
    assert(resAI.ok && dataAI.success, 'AI Guide answers weather query successfully');
    const reply = dataAI.data?.answer || '';
    assert(reply.includes('Thunderstorm') || reply.includes('80%') || reply.toLowerCase().includes('rain'), 
      'AI Guide accurately quotes live/structured weather data without hallucination');
    assert(reply.toLowerCase().includes('cab') || reply.toLowerCase().includes('walking'), 
      'AI Guide incorporates structured transport recommendation (Cab instead of walking)');

    // Honest fallback when weather is unavailable
    const aiPayloadNoWeather = {
      message: 'What is the weather forecast for my trip right now?',
      context: {
        currentLocation: { lat: 17.3850, lng: 78.4867, name: 'Hyderabad' },
        itinerary: [],
        weather: null
      }
    };

    const resAINoWeather = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aiPayloadNoWeather)
    });
    const dataAINoWeather = await resAINoWeather.json();
    const replyNoWeather = dataAINoWeather.data?.answer || '';
    assert(replyNoWeather.includes('unavailable') || replyNoWeather.includes("can't reliably assess"),
      'AI Guide honestly admits weather is unavailable when no data exists (Zero Hallucination Guarantee)');
  } catch (err) {
    console.error('Error testing AI Travel Guide weather:', err);
    failCount++;
  }

  // ============================================================
  // SECTION 7: RESILIENCE & TRIP LIFECYCLE EDGE CASES
  // ============================================================
  console.log('\n--- TEST GROUP 7: Trip Lifecycle & Edge Cases ---');
  {
    const weather = createMockWeather();

    // Empty trip
    const emptyImpact = calculateWeatherTripImpact(weather, [], undefined, 'auto', []);
    assert(emptyImpact.overallSeverity === 'LOW', 'Empty trip: Impact is LOW');
    assert(emptyImpact.impactItems.length === 0, 'Empty trip: 0 impact items');

    // 1-stop trip
    const oneStopImpact = calculateWeatherTripImpact( 
      weather, 
      [outdoorTemple], 
      { stops: [{ place: outdoorTemple, arrivalTimeStr: '10:00', departureTimeStr: '11:00' }], totalDurationMin: 60 },
      'auto',
      [{ from: 'Origin', to: outdoorTemple.name, distanceKm: 2, durationMin: 10, mode: 'auto', polyline: [] }]
    );
    assert(oneStopImpact !== null && typeof oneStopImpact.summary === 'string', '1-stop trip: Evaluates cleanly without error');

    // Multi-stop trip (3 stops) in clear weather
    const multiStopImpact = calculateWeatherTripImpact(
      weather,
      [outdoorTemple, indoorMuseum, indoorRestaurant],
      {
        stops: [
          { place: outdoorTemple, arrivalTimeStr: '09:00', departureTimeStr: '10:00' },
          { place: indoorMuseum, arrivalTimeStr: '10:30', departureTimeStr: '12:00' },
          { place: indoorRestaurant, arrivalTimeStr: '12:30', departureTimeStr: '13:30' }
        ],
        totalDurationMin: 270
      },
      'auto',
      [
        { from: 'Origin', to: outdoorTemple.name, distanceKm: 2, durationMin: 10, mode: 'auto', polyline: [] },
        { from: outdoorTemple.name, to: indoorMuseum.name, distanceKm: 3, durationMin: 15, mode: 'auto', polyline: [] },
        { from: indoorMuseum.name, to: indoorRestaurant.name, distanceKm: 2, durationMin: 10, mode: 'auto', polyline: [] }
      ]
    );
    assert(multiStopImpact.overallSeverity === 'LOW', 'Multi-stop trip in clear weather: Impact is LOW');

    // Multi-stop trip with rain at outdoor stop
    const rainMultiWeather = createMockWeather({ hourlyRainAt13: 85, hourlyRainType: 'rain' });
    const multiStopRainImpact = calculateWeatherTripImpact(
      rainMultiWeather,
      [outdoorTemple, indoorMuseum],
      {
        stops: [
          { place: outdoorTemple, arrivalTimeStr: '13:00', departureTimeStr: '14:00' },
          { place: indoorMuseum, arrivalTimeStr: '15:00', departureTimeStr: '16:00' }
        ],
        totalDurationMin: 180
      },
      'cab',
      [
        { from: 'Origin', to: outdoorTemple.name, distanceKm: 2, durationMin: 10, mode: 'cab', polyline: [] },
        { from: outdoorTemple.name, to: indoorMuseum.name, distanceKm: 3, durationMin: 15, mode: 'cab', polyline: [] }
      ]
    );
    assert(multiStopRainImpact.suggestedStopOrder !== undefined, 'Multi-stop trip during rain: Produces valid suggestedStopOrder');
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log('\n================================================================');
  console.log(`   PHASE 13 TEST SUMMARY: Passed: ${passCount} | Failed: ${failCount}`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase13Suite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
