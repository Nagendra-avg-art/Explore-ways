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
  const walkTimeMin = Math.round((distanceKm / 4.5) * 60);

  // Auto-rickshaw: ~20 km/h in Hyderabad traffic + 3 min pickup buffer. Base: ₹35, then ₹15/km
  const autoTimeMin = Math.max(4, Math.round((distanceKm / 20) * 60 + 3));
  const autoCostInr = Math.round(Math.max(35, 35 + Math.max(0, distanceKm - 1.5) * 16));

  // Cab: ~24 km/h + 5 min dispatch buffer. Base: ₹70, then ₹22/km
  const cabTimeMin = Math.max(5, Math.round((distanceKm / 24) * 60 + 5));
  const cabCostInr = Math.round(Math.max(70, 70 + Math.max(0, distanceKm - 2) * 22));

  // Bus / Metro: Average speed ~16 km/h + 10 min waiting/walking buffer. Flat fare ~₹15-₹35
  const busTimeMin = Math.max(12, Math.round((distanceKm / 16) * 60 + 10));
  const busCostInr = distanceKm <= 5 ? 15 : distanceKm <= 12 ? 25 : 35;

  return {
    walk: { timeMin: walkTimeMin, costInr: 0 },
    auto: { timeMin: autoTimeMin, costInr: autoCostInr },
    cab: { timeMin: cabTimeMin, costInr: cabCostInr },
    bus: { timeMin: busTimeMin, costInr: busCostInr },
  };
}

/**
 * Calculates a complete multi-stop itinerary route starting from an origin point.
 * Computes:
 * - Leg 0: Origin -> Stop 1
 * - Leg 1: Stop 1 -> Stop 2
 * - ...
 * - Total distance (sum of all leg distances)
 * - Estimated total travel time and visit time
 */
export function calculateTripRoute(
  origin: { lat: number; lon: number; label: string; isActualGps: boolean },
  stops: Place[],
  isOptimized: boolean = false,
  distanceSavedKm: number = 0
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

  stops.forEach((stop, index) => {
    const legDistance = calculateHaversineDistanceKm(currentLat, currentLon, stop.lat, stop.lon);
    const modeEst = estimateTransportModes(legDistance);
    
    // Default primary travel time: auto/cab speed for distances > 1.2km, walking for <= 1.2km
    const estimatedTime = legDistance <= 1.2 ? modeEst.walk.timeMin : modeEst.auto.timeMin;

    legs.push({
      legIndex: index,
      fromName: currentName,
      toName: stop.name,
      fromLat: currentLat,
      fromLon: currentLon,
      toLat: stop.lat,
      toLon: stop.lon,
      distanceKm: legDistance,
      estimatedTravelTimeMin: estimatedTime,
      modeEstimates: modeEst,
    });

    totalDistanceKm += legDistance;
    totalTravelTimeMin += estimatedTime;
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
