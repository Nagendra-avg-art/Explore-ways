import { Request, Response } from 'express';

// Predefined popular Indian tourist and regional hubs with verified coordinates
const POPULAR_DESTINATIONS = [
  { city: 'Tirupati', area: 'Tirumala / City Center', state: 'Andhra Pradesh', country: 'India', lat: 13.6288, lon: 79.4192 },
  { city: 'Rajahmundry', area: 'Godavari Ghats / Danavaipeta', state: 'Andhra Pradesh', country: 'India', lat: 17.0005, lon: 81.8040 },
  { city: 'Visakhapatnam', area: 'RK Beach / Rushikonda', state: 'Andhra Pradesh', country: 'India', lat: 17.6868, lon: 83.2185 },
  { city: 'Vijayawada', area: 'Kanaka Durga / MG Road', state: 'Andhra Pradesh', country: 'India', lat: 16.5062, lon: 80.6480 },
  { city: 'Hyderabad', area: 'Old City / Charminar', state: 'Telangana', country: 'India', lat: 17.3616, lon: 78.4747 },
  { city: 'Bengaluru', area: 'Indiranagar / MG Road', state: 'Karnataka', country: 'India', lat: 12.9716, lon: 77.5946 },
  { city: 'Chennai', area: 'Marina / Mylapore', state: 'Tamil Nadu', country: 'India', lat: 13.0827, lon: 80.2707 },
  { city: 'Mumbai', area: 'Colaba / Gateway of India', state: 'Maharashtra', country: 'India', lat: 18.9220, lon: 72.8347 },
  { city: 'Delhi', area: 'Connaught Place / Central', state: 'Delhi', country: 'India', lat: 28.6315, lon: 77.2167 },
  { city: 'Goa', area: 'Panaji / North Beaches', state: 'Goa', country: 'India', lat: 15.4909, lon: 73.8278 },
  { city: 'Jaipur', area: 'Pink City / Hawa Mahal', state: 'Rajasthan', country: 'India', lat: 26.9239, lon: 75.8267 },
  { city: 'Varanasi', area: 'Ghats / Godowlia', state: 'Uttar Pradesh', country: 'India', lat: 25.3176, lon: 82.9739 },
  { city: 'Kochi', area: 'Fort Kochi', state: 'Kerala', country: 'India', lat: 9.9656, lon: 76.2421 },
  { city: 'Kolkata', area: 'Park Street / Victoria', state: 'West Bengal', country: 'India', lat: 22.5726, lon: 88.3639 },
  { city: 'Pune', area: 'Shivajinagar / FC Road', state: 'Maharashtra', country: 'India', lat: 18.5204, lon: 73.8567 },
  { city: 'Mysuru', area: 'Mysore Palace / Central', state: 'Karnataka', country: 'India', lat: 12.2958, lon: 76.6394 },
  { city: 'Amritsar', area: 'Golden Temple / Heritage', state: 'Punjab', country: 'India', lat: 31.6340, lon: 74.8723 },
  { city: 'Agra', area: 'Taj Ganj / Fatehabad Road', state: 'Uttar Pradesh', country: 'India', lat: 27.1767, lon: 78.0081 },
  { city: 'Udaipur', area: 'Lake Pichola / City Palace', state: 'Rajasthan', country: 'India', lat: 24.5854, lon: 73.7125 },
  { city: 'Ooty', area: 'Nilgiri / Lake Area', state: 'Tamil Nadu', country: 'India', lat: 11.4102, lon: 76.6950 },
  { city: 'Pondicherry', area: 'White Town / Promenade', state: 'Puducherry', country: 'India', lat: 11.9416, lon: 79.8083 },
  { city: 'Madurai', area: 'Meenakshi Temple / Central', state: 'Tamil Nadu', country: 'India', lat: 9.9252, lon: 78.1198 },
];

/**
 * GET /api/location/reverse
 * Query params: lat, lon
 */
export const reverseGeocode = async (req: Request, res: Response) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lon as string);

  if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return res.status(400).json({ error: 'Invalid numeric coordinates: lat must be between -90 and 90, lon between -180 and 180' });
  }

  try {
    // Attempt live reverse geocoding via OpenStreetMap Nominatim
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6-second timeout for reliable network handling

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'SmartTravelCompanion/1.0 (academic-project)',
        'Accept-Language': 'en'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json() as any;
      const addr = data.address || {};

      // Robust address extraction supporting hamlets, villages, towns, and districts
      const area = addr.hamlet || addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || addr.road || addr.village || 'Local Area';
      const city = addr.city || addr.town || addr.municipality || addr.state_district || addr.county || addr.village || area;
      const state = addr.state || '';
      const country = addr.country || 'India';
      const formatted = area !== city ? `${area}, ${city}` : (state ? `${city}, ${state}` : city);

      return res.status(200).json({
        success: true,
        source: 'nominatim',
        lat: latitude,
        lon: longitude,
        city,
        area,
        state,
        country,
        formatted,
        fullAddress: data.display_name
      });
    }
  } catch (err: unknown) {
    console.warn('External geocoding failed or timed out:', (err as Error)?.message);
  }

  // Graceful fallback: Check if coordinates are close to a known hub (within ~25 km / 0.23 degrees)
  let closest: typeof POPULAR_DESTINATIONS[0] | null = null;
  let minDistance = Infinity;

  for (const dest of POPULAR_DESTINATIONS) {
    const d = Math.hypot(dest.lat - latitude, dest.lon - longitude);
    if (d < minDistance) {
      minDistance = d;
      closest = dest;
    }
  }

  // Only snap to a known hub if strictly within ~25 km (0.23 degrees). NEVER claim user is in Bangalore when at Ramireddy Palle!
  if (closest && minDistance <= 0.23) {
    return res.status(200).json({
      success: true,
      source: 'fallback-cache',
      lat: latitude,
      lon: longitude,
      city: closest.city,
      area: closest.area,
      state: closest.state,
      country: closest.country,
      formatted: `${closest.area}, ${closest.city}`,
      fullAddress: `${closest.area}, ${closest.city}, ${closest.state}, ${closest.country}`
    });
  }

  // Beyond known hubs: Return honest coordinates without inventing distant cities
  return res.status(200).json({
    success: true,
    source: 'gps-coordinates',
    lat: latitude,
    lon: longitude,
    city: 'Current Location',
    area: 'GPS Coordinates',
    state: '',
    country: 'India',
    formatted: `Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
    fullAddress: `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
  });
};

/**
 * GET /api/location/search
 * Query params: q
 */
export const searchLocations = async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim().toLowerCase();

  if (!query) {
    return res.status(200).json({
      success: true,
      results: POPULAR_DESTINATIONS.map(d => ({
        ...d,
        formatted: `${d.city}, ${d.state}`
      }))
    });
  }

  // First check our verified Indian destinations (zero latency, high reliability)
  const localMatches = POPULAR_DESTINATIONS.filter(d => 
    d.city.toLowerCase().includes(query) || 
    d.area.toLowerCase().includes(query) ||
    d.state.toLowerCase().includes(query)
  ).map(d => ({
    ...d,
    formatted: `${d.city}, ${d.state}`
  }));

  try {
    const searchUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'SmartTravelCompanion/1.0 (academic-project)',
        'Accept-Language': 'en'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json() as any;
      const remoteResults = data.map((item: any) => {
        const addr = item.address || {};
        const city = addr.city || addr.town || addr.village || addr.municipality || item.name;
        const area = addr.suburb || addr.neighbourhood || addr.state_district || addr.state || city;
        return {
          city,
          area,
          state: addr.state || '',
          country: addr.country || '',
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          formatted: `${city}, ${addr.state || addr.country || ''}`
        };
      });

      // Combine local matches + remote results, deduplicating by approximate coordinates
      const combined = [...localMatches];
      for (const rem of remoteResults) {
        const isDuplicate = combined.some(loc => 
          Math.hypot(loc.lat - rem.lat, loc.lon - rem.lon) < 0.1 ||
          loc.city.toLowerCase() === rem.city.toLowerCase()
        );
        if (!isDuplicate) {
          combined.push(rem);
        }
      }

      return res.status(200).json({
        success: true,
        results: combined.slice(0, 10)
      });
    }
  } catch (err) {
    console.warn('External location search skipped:', (err as Error)?.message);
  }

  // If remote fails, return local verified matches. If none, return empty list (never invent fake Hyderabad coordinates or 'Custom' tags!)
  return res.status(200).json({
    success: true,
    results: localMatches
  });
};

