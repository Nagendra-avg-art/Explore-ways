import { Request, Response } from 'express';
import { fetchLocationWeather } from '../services/weatherService.js';

export async function getWeather(req: Request, res: Response): Promise<void> {
  const latStr = req.query.lat as string;
  const lonStr = req.query.lon as string;
  const city = (req.query.city as string) || undefined;
  const refresh = req.query.refresh === 'true';

  if (!latStr || !lonStr) {
    res.status(400).json({
      success: false,
      error: 'Missing required query parameters: lat and lon',
    });
    return;
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    res.status(400).json({
      success: false,
      error: 'Invalid coordinates: lat must be between -90 and 90, lon between -180 and 180',
    });
    return;
  }

  try {
    const weather = await fetchLocationWeather(lat, lon, city, refresh);
    res.status(200).json({
      success: true,
      weather,
    });
  } catch (err: any) {
    console.error('[WeatherController] Error fetching weather:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve weather data',
      ...(process.env.NODE_ENV !== 'production' && { message: err?.message }),
    });
  }
}
