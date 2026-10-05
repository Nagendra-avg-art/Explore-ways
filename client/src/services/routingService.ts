/**
 * Routing & Distance Calculation Service
 * 
 * Provides:
 * - Accurate Haversine great-circle geographic distance calculations between GPS coordinates
 * - Multi-stop sequential itinerary distance summation (Origin -> Stop 1 -> Stop 2 -> ...)
 * - Algorithmic transit time and cost estimation per route leg (clearly marked as demo/heuristic model)
 * - Nearest-Neighbor Route Optimization to minimize travel distance and eliminate backtracking
 */

import { Place, RouteLeg, TripRoute } from '../types/travel';

const EARTH_RADIUS_KM = 6371.0;

/**
 * Calculates geographic great-circle distance between two latitude/longitude points in kilometers.
 * Uses the standard Haversine formula.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100; // rounded to 2 decimal places
}

/**
 * Formats a distance in kilometers into a human-friendly label (e.g. "450 m" or "3.8 km").
 */
export function formatDistanceKm(km: number): string {
  if (km < 1) {
    const meters = Math.round(km * 1000);
    return `${meters} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Parses a visit duration string like '1–2 hrs' into estimated minutes.
 */
export function parseVisitDurationMinutes(durationStr?: string): number {
  if (!durationStr) return 90;
  const lower = durationStr.toLowerCase();
  if (lower.includes('30 min') || lower.includes('45 min')) return 45;
  if (lower.includes('1–2 hrs') || lower.includes('1-2 hrs')) return 90;
  if (lower.includes('2–3 hrs') || lower.includes('2-3 hrs')) return 150;
  if (lower.includes('2–4 hrs') || lower.includes('2-4 hrs')) return 180;
  if (lower.includes('3–4 hrs') || lower.includes('3-4 hrs')) return 210;
  if (lower.includes('1 hr') || lower.includes('1 hour')) return 60;
  if (lower.includes('2 hrs') || lower.includes('2 hours')) return 120;
  return 90;
}

/**
 * Estimates transit time and approximate cost for different transport modes.
 * NOTE: These are heuristic estimates based on urban traffic models (not live telematics).
 */
export function estimateTransportModes(distanceKm: number): RouteLeg['modeEstimates'] {
  // Walking: ~4.5 km/h
  const walkTimeMin = Math.max(1, Math.round((distanceKm / 4.5) * 60));

  // Auto-rickshaw: ~20 km/h in Hyderabad traffic + 3 min pickup buffer. Base: ₹35 (first 1.5km), then ~₹16/km
  const autoTimeMin = Math.max(4, Math.round((distanceKm / 20) * 60 + 3));
  const minAuto = Math.round(Math.max(35, 35 + Math.max(0, distanceKm - 1.5) * 14));
  const maxAuto = Math.round(Math.max(45, 45 + Math.max(0, distanceKm - 1.5) * 18));
  const avgAutoCost = Math.round((minAuto + maxAuto) / 2);

  // Cab: ~24 km/h + 5 min dispatch buffer. Base: ₹70 (first 2km), then ~₹22/km
  const cabTimeMin = Math.max(5, Math.round((distanceKm / 24) * 60 + 5));
  const minCab = Math.round(Math.max(70, 70 + Math.max(0, distanceKm - 2) * 20));
  const maxCab = Math.round(Math.max(90, 90 + Math.max(0, distanceKm - 2) * 25));
  const avgCabCost = Math.round((minCab + maxCab) / 2);

  // Bus / Metro: Average speed ~16 km/h + 10 min waiting/walking buffer. Flat fare ~₹15-₹35
  const busTimeMin = Math.max(12, Math.round((distanceKm / 16) * 60 + 10));
  const busCostInr = distanceKm <= 5 ? 15 : distanceKm <= 12 ? 25 : 35;

  return {
    walk: { timeMin: walkTimeMin, costInr: 0, label: 'Walking' },
    auto: { timeMin: autoTimeMin, costInr: avgAutoCost, costRange: `₹${minAuto}–₹${maxAuto}`, label: 'Auto Rickshaw' },
    cab: { timeMin: cabTimeMin, costInr: avgCabCost, costRange: `₹${minCab}–₹${maxCab}`, label: 'Cab (Ola/Uber)' },
    bus: { timeMin: busTimeMin, costInr: busCostInr, costRange: `₹${busCostInr}`, label: 'Bus / Metro' },
  };
}

/**
 * Calculates a complete multi-stop itinerary route starting from an origin point.
 * Computes:
 * - Leg 0: Origin -> Stop 1
 * - Leg 1: Stop 1 -> Stop 2
 * - ...
 * - Total distance (sum of all leg distances)
 * - Estimated total travel time, transport cost, and visit time
 */
export function calculateTripRoute(
  origin: { lat: number; lon: number; label: string; isActualGps: boolean },
  stops: Place[],
  isOptimized: boolean = false,
  distanceSavedKm: number = 0,
  preferredMode: import('../types/travel').TransportMode = 'auto'
): TripRoute {
  if (stops.length === 0) {
    return {
      origin,
      stops: [],
      legs: [],
      totalDistanceKm: 0,
      totalTravelTimeMin: 0,
      totalVisitTimeMin: 0,
      totalEstimatedDurationMin: 0,
      preferredMode,
      totalEstimatedTransportCostInr: 0,
      isOptimized: false,
      distanceSavedKm: 0,
    };
  }

  const legs: RouteLeg[] = [];
  let currentLat = origin.lat;
  let currentLon = origin.lon;
  let currentName = origin.label;

  let totalDistanceKm = 0;
  let totalTravelTimeMin = 0;
  let totalVisitTimeMin = 0;
  let totalTransportCostInr = 0;

  stops.forEach((stop, index) => {
    const legDistance = calculateHaversineDistanceKm(currentLat, currentLon, stop.lat, stop.lon);
    const modeEst = estimateTransportModes(legDistance);
    
    // Pick travel time and cost based on user preferred mode
    let legTravelTime: number;
    let legCost: number;

    switch (preferredMode) {
      case 'walk':
        legTravelTime = modeEst.walk.timeMin;
        legCost = 0;
        break;
      case 'cab':
        legTravelTime = modeEst.cab.timeMin;
        legCost = modeEst.cab.costInr;
        break;
      case 'bus':
        legTravelTime = modeEst.bus.timeMin;
        legCost = modeEst.bus.costInr;
        break;
      case 'auto':
      default:
        // For very short hops under 600m, walking is practical, otherwise auto
        if (legDistance <= 0.6) {
          legTravelTime = modeEst.walk.timeMin;
          legCost = 0;
        } else {
          legTravelTime = modeEst.auto.timeMin;
          legCost = modeEst.auto.costInr;
        }
        break;
    }

    legs.push({
      legIndex: index,
      fromName: currentName,
      toName: stop.name,
      fromLat: currentLat,
      fromLon: currentLon,
      toLat: stop.lat,
      toLon: stop.lon,
      distanceKm: legDistance,
      estimatedTravelTimeMin: legTravelTime,
      modeEstimates: modeEst,
    });

    totalDistanceKm += legDistance;
    totalTravelTimeMin += legTravelTime;
    totalTransportCostInr += legCost;
    totalVisitTimeMin += parseVisitDurationMinutes(stop.visitDuration);

    currentLat = stop.lat;
    currentLon = stop.lon;
    currentName = stop.name;
  });

  return {
    origin,
    stops,
    legs,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalTravelTimeMin,
    totalVisitTimeMin,
    totalEstimatedDurationMin: totalTravelTimeMin + totalVisitTimeMin,
    preferredMode,
    totalEstimatedTransportCostInr: totalTransportCostInr,
    isOptimized,
    distanceSavedKm: Math.round(distanceSavedKm * 10) / 10,
  };
}

/**
 * Optimizes route order using a Nearest-Neighbor TSP heuristic.
 * 
 * Starting from the origin point:
 * 1. Finds the closest unvisited stop
 * 2. Adds it to the sequence and advances current location
 * 3. Repeats until all stops are ordered
 * 
 * Returns the reordered stops, original distance, optimized distance, and distance saved.
 */
export function optimizeRouteNearestNeighbor(
  origin: { lat: number; lon: number },
  stops: Place[]
): {
  orderedStops: Place[];
  distanceBeforeKm: number;
  distanceAfterKm: number;
  distanceSavedKm: number;
} {
  if (stops.length <= 1) {
    return {
      orderedStops: [...stops],
      distanceBeforeKm: 0,
      distanceAfterKm: 0,
      distanceSavedKm: 0,
    };
  }

  // Calculate original total distance
  let beforeDistance = 0;
  let curLat = origin.lat;
  let curLon = origin.lon;
  for (const stop of stops) {
    beforeDistance += calculateHaversineDistanceKm(curLat, curLon, stop.lat, stop.lon);
    curLat = stop.lat;
    curLon = stop.lon;
  }

  // Nearest neighbor greedy search
  const unvisited = [...stops];
  const orderedStops: Place[] = [];
  curLat = origin.lat;
  curLon = origin.lon;

  while (unvisited.length > 0) {
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = calculateHaversineDistanceKm(curLat, curLon, unvisited[i].lat, unvisited[i].lon);
      if (d < minDistance) {
        minDistance = d;
        closestIndex = i;
      }
    }

    const nextStop = unvisited.splice(closestIndex, 1)[0];
    orderedStops.push(nextStop);
    curLat = nextStop.lat;
    curLon = nextStop.lon;
  }

  // Calculate optimized total distance
  let afterDistance = 0;
  curLat = origin.lat;
  curLon = origin.lon;
  for (const stop of orderedStops) {
    afterDistance += calculateHaversineDistanceKm(curLat, curLon, stop.lat, stop.lon);
    curLat = stop.lat;
    curLon = stop.lon;
  }

  const distanceSavedKm = Math.max(0, beforeDistance - afterDistance);

  return {
    orderedStops,
    distanceBeforeKm: Math.round(beforeDistance * 10) / 10,
    distanceAfterKm: Math.round(afterDistance * 10) / 10,
    distanceSavedKm: Math.round(distanceSavedKm * 10) / 10,
  };
}

/**
 * Fetches real road network directions and geometry from the backend routing API.
 * Calls /api/routes/directions with waypoint coordinates.
 */
export async function fetchRealRoadDirections(
  waypoints: { lat: number; lon: number }[],
  mode: import('../types/travel').TransportMode = 'auto'
): Promise<{
  isRoadNetwork: boolean;
  source: string;
  totalDistanceKm: number;
  totalDurationMin: number;
  coordinates: [number, number][];
  legs: {
    legIndex: number;
    distanceKm: number;
    durationMin: number;
    maneuvers: import('../types/travel').RouteManeuver[];
  }[];
} | null> {
  if (waypoints.length < 2) return null;

  const coordStr = waypoints.map((w) => `${w.lon.toFixed(6)},${w.lat.toFixed(6)}`).join(';');
  const profile = mode === 'walk' ? 'walking' : 'driving';

  try {
    const res = await fetch(`/api/routes/directions?coordinates=${encodeURIComponent(coordStr)}&mode=${profile}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data.success && Array.isArray(data.coordinates)) {
      return {
        isRoadNetwork: data.isRoadNetwork === true,
        source: data.source || 'osrm',
        totalDistanceKm: data.totalDistanceKm,
        totalDurationMin: data.totalDurationMin,
        coordinates: data.coordinates,
        legs: data.legs || [],
      };
    }
  } catch (err: unknown) {
    console.warn('Real road routing request failed, staying on direct distance:', (err as Error)?.message);
  }
  return null;
}

