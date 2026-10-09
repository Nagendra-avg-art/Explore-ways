import { 
  WeatherData, 
  CurrentWeather, 
  HourlyForecastItem, 
  DailyForecastItem, 
  WeatherConditionType 
} from '../types/weather.js';

interface CacheEntry {
  data: WeatherData;
  expiresAt: number;
}

// In-memory weather cache (keyed by lat:lon at 3 decimal places ~100m precision)
const weatherCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Translates WMO weather codes (World Meteorological Organization) into normalized condition, icon, and type.
 */
export function parseWmoWeatherCode(code: number): {
  condition: string;
  conditionType: WeatherConditionType;
  icon: string;
} {
  switch (code) {
    case 0:
      return { condition: 'Clear Sky', conditionType: 'clear', icon: '☀️' };
    case 1:
      return { condition: 'Mainly Clear', conditionType: 'clear', icon: '🌤️' };
    case 2:
      return { condition: 'Partly Cloudy', conditionType: 'partly_cloudy', icon: '⛅' };
    case 3:
      return { condition: 'Overcast', conditionType: 'cloudy', icon: '☁️' };
    case 45:
    case 48:
      return { condition: 'Foggy', conditionType: 'fog', icon: '🌫️' };
    case 51:
    case 53:
    case 55:
      return { condition: 'Light Drizzle', conditionType: 'drizzle', icon: '🌦️' };
    case 56:
    case 57:
      return { condition: 'Freezing Drizzle', conditionType: 'drizzle', icon: '🌧️' };
    case 61:
      return { condition: 'Light Rain', conditionType: 'rain', icon: '🌧️' };
    case 63:
      return { condition: 'Moderate Rain', conditionType: 'rain', icon: '🌧️' };
    case 65:
      return { condition: 'Heavy Rain', conditionType: 'heavy_rain', icon: '🌧️' };
    case 66:
    case 67:
      return { condition: 'Freezing Rain', conditionType: 'rain', icon: '🌧️' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { condition: 'Snowfall', conditionType: 'snow', icon: '❄️' };
    case 80:
      return { condition: 'Light Rain Showers', conditionType: 'rain', icon: '🌦️' };
    case 81:
      return { condition: 'Moderate Rain Showers', conditionType: 'rain', icon: '🌧️' };
    case 82:
      return { condition: 'Violent Rain Showers', conditionType: 'heavy_rain', icon: '⛈️' };
    case 85:
    case 86:
      return { condition: 'Snow Showers', conditionType: 'snow', icon: '🌨️' };
    case 95:
      return { condition: 'Thunderstorm', conditionType: 'thunderstorm', icon: '⛈️' };
    case 96:
    case 99:
      return { condition: 'Thunderstorm with Hail', conditionType: 'thunderstorm', icon: '⛈️' };
    default:
      return { condition: 'Partly Cloudy', conditionType: 'partly_cloudy', icon: '🌤️' };
  }
}

/**
 * Deterministic fallback weather generator for offline mode or network failure.
 * Models a realistic daily diurnal cycle based on location coordinates.
 */
export function generateFallbackWeatherData(lat: number, lon: number, city?: string): WeatherData {
  const now = new Date();
  const currentHour = now.getHours();
  
  // Approximate baseline temperature around 28-32°C for South/Central India coords
  const isAfternoon = currentHour >= 12 && currentHour <= 16;
  const isNight = currentHour < 6 || currentHour > 20;
  const baseTemp = isAfternoon ? 32 : isNight ? 24 : 28;

  const current: CurrentWeather = {
    temperature: baseTemp,
    feelsLike: baseTemp + 2,
    condition: isAfternoon ? 'Partly Cloudy' : isNight ? 'Clear Night' : 'Pleasant & Clear',
    conditionType: 'partly_cloudy',
    icon: isAfternoon ? '⛅' : isNight ? '🌙' : '☀️',
    precipitationMm: 0,
    precipitationProbability: isAfternoon ? 20 : 10,
    windSpeedKmh: 14,
    humidity: 58,
    isDay: !isNight,
  };

  const hourlyForecast: HourlyForecastItem[] = [];
  for (let i = 0; i < 24; i++) {
    const fHour = (currentHour + i) % 24;
    const fDate = new Date(now.getTime() + i * 3600 * 1000);
    const hourTemp = (fHour >= 12 && fHour <= 15) ? 32 : (fHour >= 1 && fHour <= 5) ? 23 : 28;
    const rainProb = (fHour >= 13 && fHour <= 16) ? 35 : 10;
    const wInfo = rainProb > 30 
      ? { condition: 'Possible Shower', conditionType: 'drizzle' as WeatherConditionType, icon: '🌦️' }
      : { condition: 'Clear / Fair', conditionType: 'clear' as WeatherConditionType, icon: '☀️' };

    hourlyForecast.push({
      time: `${String(fHour).padStart(2, '0')}:00`,
      isoTime: fDate.toISOString(),
      hour: fHour,
      temperature: hourTemp,
      feelsLike: hourTemp + 2,
      condition: wInfo.condition,
      conditionType: wInfo.conditionType,
      icon: wInfo.icon,
      precipitationProbability: rainProb,
      precipitationMm: rainProb > 30 ? 0.8 : 0,
      windSpeedKmh: 12 + (i % 4),
    });
  }

  const dailyForecast: DailyForecastItem[] = [
    {
      date: now.toISOString().split('T')[0],
      tempMin: 23,
      tempMax: 33,
      condition: 'Partly Cloudy',
      conditionType: 'partly_cloudy',
      icon: '⛅',
      precipitationProbability: 35,
    },
    {
      date: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
      tempMin: 24,
      tempMax: 32,
      condition: 'Clear Sky',
      conditionType: 'clear',
      icon: '☀️',
      precipitationProbability: 15,
    }
  ];

  return {
    location: { lat, lon, city: city || 'Current Location' },
    latitude: lat,
    longitude: lon,
    timezone: 'Asia/Kolkata',
    current,
    hourlyForecast,
    dailyForecast,
    fetchedAt: now.toISOString(),
    provider: 'Offline Resilience Fallback',
  };
}

/**
 * Fetches real weather data from Open-Meteo with caching and error isolation.
 */
export async function fetchLocationWeather(
  lat: number, 
  lon: number, 
  city?: string,
  forceRefresh: boolean = false
): Promise<WeatherData> {
  const cacheKey = `weather:${lat.toFixed(3)}:${lon.toFixed(3)}`;
  const now = Date.now();

  if (!forceRefresh) {
    const cached = weatherCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat.toString());
    url.searchParams.set('longitude', lon.toString());
    url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,is_day');
    url.searchParams.set('hourly', 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m');
    url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '2');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 sec timeout

    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP error ${res.status}`);
    }

    const json = await res.json() as any;

    // Parse current conditions
    const curr = json.current || {};
    const wCode = curr.weather_code ?? 0;
    const { condition, conditionType, icon } = parseWmoWeatherCode(wCode);

    const current: CurrentWeather = {
      temperature: Math.round(curr.temperature_2m ?? 28),
      feelsLike: Math.round(curr.apparent_temperature ?? curr.temperature_2m ?? 28),
      condition,
      conditionType,
      icon,
      precipitationMm: curr.precipitation ?? 0,
      precipitationProbability: json.hourly?.precipitation_probability?.[0] ?? 0,
      windSpeedKmh: Math.round(curr.wind_speed_10m ?? 10),
      humidity: Math.round(curr.relative_humidity_2m ?? 60),
      isDay: curr.is_day === 1,
    };

    // Parse hourly forecast (next 24 hours)
    const hourlyTimes = json.hourly?.time || [];
    const hourlyTemps = json.hourly?.temperature_2m || [];
    const hourlyAppTemps = json.hourly?.apparent_temperature || [];
    const hourlyProbs = json.hourly?.precipitation_probability || [];
    const hourlyPrecip = json.hourly?.precipitation || [];
    const hourlyCodes = json.hourly?.weather_code || [];
    const hourlyWinds = json.hourly?.wind_speed_10m || [];

    const nowIso = new Date().toISOString();
    let startIndex = 0;
    // Find closest current hour index
    for (let i = 0; i < hourlyTimes.length; i++) {
      if (hourlyTimes[i] >= nowIso.substring(0, 13)) {
        startIndex = i;
        break;
      }
    }

    const hourlyForecast: HourlyForecastItem[] = [];
    for (let i = startIndex; i < Math.min(startIndex + 24, hourlyTimes.length); i++) {
      const isoStr = hourlyTimes[i];
      const dateObj = new Date(isoStr);
      const hour = dateObj.getHours();
      const code = hourlyCodes[i] ?? 0;
      const parsed = parseWmoWeatherCode(code);

      hourlyForecast.push({
        time: `${String(hour).padStart(2, '0')}:00`,
        isoTime: isoStr,
        hour,
        temperature: Math.round(hourlyTemps[i] ?? 25),
        feelsLike: Math.round(hourlyAppTemps[i] ?? hourlyTemps[i] ?? 25),
        condition: parsed.condition,
        conditionType: parsed.conditionType,
        icon: parsed.icon,
        precipitationProbability: Math.round(hourlyProbs[i] ?? 0),
        precipitationMm: Math.round((hourlyPrecip[i] ?? 0) * 10) / 10,
        windSpeedKmh: Math.round(hourlyWinds[i] ?? 10),
      });
    }

    // Parse daily forecast
    const dailyDates = json.daily?.time || [];
    const dailyCodes = json.daily?.weather_code || [];
    const dailyMin = json.daily?.temperature_2m_min || [];
    const dailyMax = json.daily?.temperature_2m_max || [];
    const dailyProbs = json.daily?.precipitation_probability_max || [];

    const dailyForecast: DailyForecastItem[] = [];
    for (let i = 0; i < Math.min(2, dailyDates.length); i++) {
      const parsed = parseWmoWeatherCode(dailyCodes[i] ?? 0);
      dailyForecast.push({
        date: dailyDates[i],
        tempMin: Math.round(dailyMin[i] ?? 22),
        tempMax: Math.round(dailyMax[i] ?? 32),
        condition: parsed.condition,
        conditionType: parsed.conditionType,
        icon: parsed.icon,
        precipitationProbability: Math.round(dailyProbs[i] ?? 0),
      });
    }

    const weatherData: WeatherData = {
      location: { lat, lon, city: city || 'Detected Location' },
      latitude: lat,
      longitude: lon,
      timezone: json.timezone || 'Asia/Kolkata',
      current,
      hourlyForecast,
      dailyForecast,
      fetchedAt: new Date().toISOString(),
      provider: 'Open-Meteo Weather API',
    };

    // Store in cache
    weatherCache.set(cacheKey, {
      data: weatherData,
      expiresAt: now + CACHE_TTL_MS,
    });

    return weatherData;
  } catch (err) {
    console.warn(`[WeatherService] Provider fetch failed for (${lat}, ${lon}):`, (err as any)?.message || err);
    // Return resilient fallback data rather than crashing
    const fallback = generateFallbackWeatherData(lat, lon, city);
    return fallback;
  }
}
