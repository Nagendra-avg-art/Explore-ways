import { Request, Response } from 'express';

interface CachedRoute {
  timestamp: number;
  data: any;
}

const routeCache = new Map<string, CachedRoute>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * GET /api/routes/directions
 * 
 * Query parameters:
 * - coordinates: lon1,lat1;lon2,lat2;lon3,lat3 (semicolon-delimited list of waypoints)
 * - mode: 'driving' (default) | 'walking'
 */
export const getDirections = async (req: Request, res: Response) => {
  const queryParam = (req.query.coordinates || req.query.waypoints) as string;
  const { mode = 'driving' } = req.query;

  if (!queryParam || typeof queryParam !== 'string') {
    return res.status(400).json({ error: 'Missing coordinates parameter (format: lon1,lat1;lon2,lat2)' });
  }

  // Parse and validate coordinate pairs
  const pairs = queryParam.split(';').map((pair) => pair.trim()).filter(Boolean);
  if (pairs.length < 2) {
    return res.status(400).json({ error: 'At least 2 coordinate pairs are required for routing' });
  }

  const parsedWaypoints: { lat: number; lon: number }[] = [];
  for (const pair of pairs) {
    const parts = pair.split(',');
    if (parts.length !== 2) {
      return res.status(400).json({ error: `Invalid coordinate pair format: "${pair}". Expected "lon,lat"` });
    }
    let valA = parseFloat(parts[0]);
    let valB = parseFloat(parts[1]);
    if (isNaN(valA) || isNaN(valB)) {
      return res.status(400).json({ error: `Invalid numeric coordinates in "${pair}"` });
    }
    // Default format is lon,lat (OSRM standard).
    // Auto-detect if coordinates were passed as lat,lon:
    let lon = valA;
    let lat = valB;
    if (Math.abs(valA) <= 45 && Math.abs(valB) > 45) {
      lat = valA;
      lon = valB;
    }
    parsedWaypoints.push({ lat, lon });
  }

  // Build normalized OSRM coordinate string (strictly lon,lat for OSRM)
  const osrmCoordString = parsedWaypoints.map((p) => `${p.lon},${p.lat}`).join(';');

  const profile = mode === 'walking' || mode === 'walk' ? 'walking' : 'driving';
  const cacheKey = `${profile}_${queryParam}`;

  // Check in-memory cache
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.status(200).json(cached.data);
  }

  // Attempt real road routing via OSRM
  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${osrmCoordString}?overview=full&geometries=geojson&steps=true`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5s timeout

    const osrmResponse = await fetch(osrmUrl, {
      headers: {
        'User-Agent': 'SmartTravelCompanion/1.0 (academic-project)',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (osrmResponse.ok) {
      const data = await osrmResponse.json() as any;

      if (data.code === 'Ok' && Array.isArray(data.routes) && data.routes.length > 0) {
        const route = data.routes[0];
        
        // GeoJSON coordinates from OSRM are [lon, lat]. Convert to Leaflet [lat, lon].
        const leafletCoordinates: [number, number][] = route.geometry.coordinates.map(
          ([lon, lat]: [number, number]) => [lat, lon]
        );

        const totalDistanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const totalDurationMin = Math.max(1, Math.round(route.duration / 60));

        const legs = (route.legs || []).map((leg: any, idx: number) => {
          const legDistanceKm = Math.round((leg.distance / 1000) * 10) / 10;
          const legDurationMin = Math.max(1, Math.round(leg.duration / 60));
          
          // Extract turn maneuvers
          const maneuvers = (leg.steps || []).map((step: any) => {
            const maneuverType = step.maneuver?.type || 'turn';
            const modifier = step.maneuver?.modifier ? ` ${step.maneuver.modifier}` : '';
            const roadName = step.name ? ` onto ${step.name}` : '';
            const instruction = `${maneuverType}${modifier}${roadName}`.trim();
            return {
              instruction: instruction.charAt(0).toUpperCase() + instruction.slice(1),
              distanceMeters: Math.round(step.distance || 0),
              durationSeconds: Math.round(step.duration || 0)
            };
          });

          return {
            legIndex: idx,
            distanceKm: legDistanceKm,
            durationMin: legDurationMin,
            maneuvers
          };
        });

        const result = {
          success: true,
          isRoadNetwork: true,
          source: 'osrm',
          mode: profile,
          totalDistanceKm,
          totalDurationMin,
          coordinates: leafletCoordinates,
          legs,
          waypointsCount: parsedWaypoints.length
        };

        routeCache.set(cacheKey, { timestamp: Date.now(), data: result });
        return res.status(200).json(result);
      }
    }
  } catch (err: unknown) {
    console.warn('[Routes API] OSRM live routing timed out or unavailable, using heuristic fallback:', (err as Error)?.message);
  }

  // Graceful Fallback: Haversine distance with urban road curvature factor (1.28x)
  let sumDistanceKm = 0;
  const fallbackLegs = [];
  const fallbackPoints: [number, number][] = [];

  for (let i = 0; i < parsedWaypoints.length; i++) {
    const pt = parsedWaypoints[i];
    fallbackPoints.push([pt.lat, pt.lon]);

    if (i > 0) {
      const prev = parsedWaypoints[i - 1];
      const straightDist = calculateHaversineDistanceKm(prev.lat, prev.lon, pt.lat, pt.lon);
      const roadDistKm = Math.round(straightDist * 1.28 * 10) / 10;
      const legDurationMin = Math.max(2, Math.round(roadDistKm * (profile === 'walking' ? 13 : 2.8)));

      sumDistanceKm += roadDistKm;
      fallbackLegs.push({
        legIndex: i - 1,
        distanceKm: roadDistKm,
        durationMin: legDurationMin,
        maneuvers: [
          { instruction: `Proceed toward destination`, distanceMeters: Math.round(roadDistKm * 1000), durationSeconds: legDurationMin * 60 }
        ]
      });
    }
  }

  const fallbackResult = {
    success: true,
    isRoadNetwork: false,
    source: 'haversine-estimate',
    mode: profile,
    totalDistanceKm: Math.round(sumDistanceKm * 10) / 10,
    totalDurationMin: Math.max(3, Math.round(sumDistanceKm * (profile === 'walking' ? 13 : 2.8))),
    coordinates: fallbackPoints,
    legs: fallbackLegs,
    waypointsCount: parsedWaypoints.length
  };

  return res.status(200).json(fallbackResult);
};
