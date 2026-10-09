import { WeatherData } from '../types/weather';
import { getApiUrl } from './apiConfig';

/**
 * Fetches current weather and hourly/daily forecast for specified coordinates.
 */
export async function getLiveWeather(
  lat: number,
  lon: number,
  city?: string,
  forceRefresh: boolean = false
): Promise<WeatherData> {
  const queryParams = new URLSearchParams();
  queryParams.set('lat', lat.toString());
  queryParams.set('lon', lon.toString());
  if (city) {
    queryParams.set('city', city);
  }
  if (forceRefresh) {
    queryParams.set('refresh', 'true');
  }

  const endpoint = getApiUrl(`/api/weather?${queryParams.toString()}`);

  const res = await fetch(endpoint, {
    headers: { 'Accept': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Weather API returned HTTP ${res.status}`);
  }

  const json = await res.json();
  if (!json.success || !json.weather) {
    throw new Error(json.error || 'Failed to parse weather data');
  }

  return json.weather as WeatherData;
}
