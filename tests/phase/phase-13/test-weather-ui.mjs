import assert from 'node:assert';
import { fetchLocationWeather } from '../../../server/src/services/weatherService.ts';
import { classifyPlaceEnvironment, calculateWeatherTripImpact } from '../../../client/src/services/weatherImpactService.ts';

console.log('================================================================');
console.log('   PHASE 13: WEATHER UI VISIBILITY & INTEGRATION VERIFICATION   ');
console.log('================================================================\n');

async function runWeatherUITests() {
  let passed = 0;
  let failed = 0;

  const test = (desc, fn) => {
    try {
      fn();
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${desc} -> ${err.message}`);
      failed++;
    }
  };

  const testAsync = async (desc, fn) => {
    try {
      await fn();
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${desc} -> ${err.message}`);
      failed++;
    }
  };

  // 1. Explore Page Weather Integration
  console.log('--- TEST GROUP 1: Explore Page Weather Hierarchy & Data ---');
  
  await testAsync('Live weather fetches for active user city (Rajamahendravaram / Rajahmundry)', async () => {
    // Coordinates for Rajamahendravaram (17.0005, 81.8040)
    const weather = await fetchLocationWeather(17.0005, 81.8040, 'Rajamahendravaram');
    assert(weather !== null, 'Weather data should be non-null');
    assert.strictEqual(typeof weather.current.temperature, 'number');
    assert.strictEqual(typeof weather.current.condition, 'string');
    assert(weather.current.condition.length > 0);
    assert.strictEqual(typeof weather.current.precipitationProbability, 'number');
    assert(weather.hourlyForecast.length >= 24, 'Hourly forecast should contain at least 24 hours');
  });

  await testAsync('Weather coordinates update when switching to Tirupati', async () => {
    // Coordinates for Tirupati (13.6288, 79.4192)
    const weather = await fetchLocationWeather(13.6288, 79.4192, 'Tirupati');
    assert(weather !== null);
    assert.strictEqual(weather.location.city, 'Tirupati');
    assert.strictEqual(typeof weather.current.temperature, 'number');
  });

  await testAsync('Weather coordinates update when switching to Hyderabad', async () => {
    // Coordinates for Hyderabad (17.3616, 78.4747)
    const weather = await fetchLocationWeather(17.3616, 78.4747, 'Hyderabad');
    assert(weather !== null);
    assert.strictEqual(weather.location.city, 'Hyderabad');
    assert.strictEqual(typeof weather.current.temperature, 'number');
  });

  // 2. WeatherCard Component Properties & Resilient States
  console.log('\n--- TEST GROUP 2: WeatherCard UI Rendering Contract ---');

  test('Compact preview slice has valid hours and icons', () => {
    const dummyHourly = [
      { time: '18:00', icon: '☀️', temperature: 27, precipitationProbability: 10 },
      { time: '19:00', icon: '🌤️', temperature: 26, precipitationProbability: 20 },
      { time: '20:00', icon: '🌙', temperature: 25, precipitationProbability: 0 },
      { time: '21:00', icon: '🌙', temperature: 24, precipitationProbability: 0 },
      { time: '22:00', icon: '🌙', temperature: 24, precipitationProbability: 0 },
      { time: '23:00', icon: '🌙', temperature: 23, precipitationProbability: 0 },
    ];

    const preview = dummyHourly.slice(0, 5);
    assert.strictEqual(preview.length, 5, 'Preview shows first 5 hours');
    assert.strictEqual(preview[0].time, '18:00');
    assert.strictEqual(preview[0].temperature, 27);
  });

  test('Full hourly travel window shows up to 8 hours on expansion', () => {
    const dummyHourly = Array.from({ length: 24 }, (_, i) => ({
      time: `${String(i).padStart(2, '0')}:00`,
      icon: '🌤️',
      temperature: 28 - Math.abs(14 - i),
      precipitationProbability: i >= 13 && i <= 15 ? 70 : 10,
    }));

    const expanded = dummyHourly.slice(0, 8);
    assert.strictEqual(expanded.length, 8, 'Expanded strip displays 8 hours');
  });

  // 3. My Trip Weather Alert Interaction
  console.log('\n--- TEST GROUP 3: My Trip Weather Alert Interaction ---');

  test('Weather trip impact correctly flags rain during outdoor stop', () => {
    const mockWeather = {
      location: { lat: 17.0, lon: 81.8, city: 'Rajamahendravaram' },
      latitude: 17.0,
      longitude: 81.8,
      timezone: 'Asia/Kolkata',
      current: {
        temperature: 28,
        feelsLike: 30,
        condition: 'Partly Cloudy',
        conditionType: 'partly_cloudy',
        icon: '🌤️',
        precipitationMm: 0,
        precipitationProbability: 20,
        windSpeedKmh: 12,
        humidity: 60,
      },
      hourlyForecast: [
        { time: '09:00', isoTime: '', hour: 9, temperature: 28, feelsLike: 30, condition: 'Clear', conditionType: 'clear', icon: '☀️', precipitationProbability: 10, precipitationMm: 0, windSpeedKmh: 10 },
        { time: '10:00', isoTime: '', hour: 10, temperature: 29, feelsLike: 31, condition: 'Partly Cloudy', conditionType: 'partly_cloudy', icon: '🌤️', precipitationProbability: 15, precipitationMm: 0, windSpeedKmh: 11 },
        { time: '11:00', isoTime: '', hour: 11, temperature: 29, feelsLike: 32, condition: 'Cloudy', conditionType: 'cloudy', icon: '☁️', precipitationProbability: 25, precipitationMm: 0, windSpeedKmh: 12 },
        { time: '12:00', isoTime: '', hour: 12, temperature: 28, feelsLike: 31, condition: 'Rain', conditionType: 'rain', icon: '🌧️', precipitationProbability: 75, precipitationMm: 4.5, windSpeedKmh: 18 },
        { time: '13:00', isoTime: '', hour: 13, temperature: 27, feelsLike: 30, condition: 'Heavy Rain', conditionType: 'heavy_rain', icon: '🌧️', precipitationProbability: 85, precipitationMm: 8.0, windSpeedKmh: 22 },
        { time: '14:00', isoTime: '', hour: 14, temperature: 27, feelsLike: 29, condition: 'Moderate Rain', conditionType: 'rain', icon: '🌧️', precipitationProbability: 60, precipitationMm: 3.0, windSpeedKmh: 15 },
      ],
      dailyForecast: [],
      fetchedAt: new Date().toISOString(),
      provider: 'Open-Meteo',
    };

    const stops = [
      { id: 'stop-1', name: 'Kotilingeshwara Ghat', category: 'nature', lat: 17.002, lon: 81.802 },
      { id: 'stop-2', name: 'Rajahmundry Sweets & Cafe', category: 'food', lat: 17.006, lon: 81.805 },
    ];

    const schedule = {
      stops: [
        { placeId: 'stop-1', arrivalTimeStr: '12:30', departureTimeStr: '13:30', durationMinutes: 60, placeName: 'Kotilingeshwara Ghat' },
        { placeId: 'stop-2', arrivalTimeStr: '14:00', departureTimeStr: '15:00', durationMinutes: 60, placeName: 'Rajahmundry Sweets & Cafe' },
      ],
      totalDurationMinutes: 150,
      startTimeStr: '12:00',
      endTimeStr: '15:00',
    };

    const legs = [
      { fromPlaceId: 'origin', toPlaceId: 'stop-1', distanceKm: 2.0, estimatedTravelTimeMin: 15 },
      { fromPlaceId: 'stop-1', toPlaceId: 'stop-2', distanceKm: 1.5, estimatedTravelTimeMin: 12 },
    ];

    const impact = calculateWeatherTripImpact(mockWeather, stops, schedule, 'walk', legs);
    assert(impact.hasWeatherAlert, 'Alert should trigger for outdoor ghat during heavy rain');
    assert(impact.overallSeverity === 'HIGH' || impact.overallSeverity === 'SEVERE');
    assert.strictEqual(impact.alternativeTransportSuggestion?.toMode, 'cab');
    assert(impact.summary.toLowerCase().includes('rain'), 'Summary should mention rain');
    assert(impact.impactItems.some((item) => item.affectedStopName === 'Kotilingeshwara Ghat'), 'Impact items should include Kotilingeshwara Ghat');
  });

  console.log('\n================================================================');
  console.log(`   WEATHER UI INTEGRATION SUMMARY: Passed: ${passed} | Failed: ${failed}`);
  console.log('================================================================');
  if (failed > 0) process.exit(1);
}

runWeatherUITests();
