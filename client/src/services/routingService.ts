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

import { 
  computeTransportTimeDetails, 
  buildRouteTransportComparison 
} from './transportTimeService';
import { 
  computeFareEstimates, 
  buildLegFareComparison, 
  computeTripFareSummary 
} from './fareEstimationService';

/**
 * Calculates honest transit time and transport options for different travel modes.
 * In Phase 9.3: Centralized distance-based fare estimation models are used.
 * Walking is marked as Free (₹0) along real road distance.
 * Auto and Cab provide realistic urban variance ranges.
 * Bus / Metro is marked as unavailable since genuine transit schedule feeds are not yet connected.
 */
export function estimateTransportModes(distanceKm: number, roadDurationMin?: number): RouteLeg['modeEstimates'] {
  const details = computeTransportTimeDetails(distanceKm, roadDurationMin, !!roadDurationMin);
  const fares = computeFareEstimates(distanceKm);

  return {
    walk: {
      timeMin: details.walk.travelTimeMin || 1,
      costInr: 0,
      label: 'Walking',
      fareDisplay: fares.walk.fareDisplay,
      distanceKm: details.walk.distanceKm || distanceKm,
      statusLabel: details.walk.statusLabel,
    },
    auto: {
      timeMin: details.auto.travelTimeMin || 5,
      costInr: Math.round((fares.auto.minFareInr + fares.auto.maxFareInr) / 2),
      costRange: fares.auto.fareDisplay,
      label: 'Auto Rickshaw',
      fareDisplay: fares.auto.fareDisplay,
      distanceKm: details.auto.distanceKm || distanceKm,
      timeDisplay: details.auto.travelTimeDisplay,
      statusLabel: details.auto.statusLabel,
    },
    cab: {
      timeMin: details.cab.travelTimeMin || 5,
      costInr: Math.round((fares.cab.minFareInr + fares.cab.maxFareInr) / 2),
      costRange: fares.cab.fareDisplay,
      label: 'Cab (Ola/Uber)',
      fareDisplay: fares.cab.fareDisplay,
      distanceKm: details.cab.distanceKm || distanceKm,
      timeDisplay: details.cab.travelTimeDisplay,
      statusLabel: details.cab.statusLabel,
    },
    bus: {
      timeMin: 0,
      costInr: 0,
      costRange: fares.bus.fareDisplay,
      label: 'Bus / Metro',
      fareDisplay: fares.bus.fareDisplay,
      distanceKm: undefined,
      timeDisplay: 'Unavailable',
      statusLabel: 'Not available',
    },
  };
}

/**
 * Calculates a complete multi-stop itinerary route starting from an origin point.
 * Computes:
 * - Leg 0: Origin -> Stop 1
 * - Leg 1: Stop 1 -> Stop 2
 * - ...
 * - Total distance (sum of all leg distances)
 * - Estimated total travel time and visit time based on chosen mode
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
      selectedModeTimeDisplay: '0 min',
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
    const transportComp = buildRouteTransportComparison(currentName, stop.name, legDistance, false);
    
    // Pick travel time based on user preferred mode
    let legTravelTime: number;
    switch (preferredMode) {
      case 'walk':
        legTravelTime = modeEst.walk.timeMin;
        break;
      case 'cab':
        legTravelTime = modeEst.cab.timeMin;
        break;
      case 'bus':
        // Fallback to auto travel time for itinerary planning buffer
        legTravelTime = modeEst.auto.timeMin;
        break;
      case 'auto':
      default:
        legTravelTime = modeEst.auto.timeMin;
        break;
    }

    const legFares = buildLegFareComparison(currentName, stop.name, legDistance);

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
      transportComparison: transportComp,
      fareComparison: legFares,
      modeEstimates: modeEst,
    });

    totalDistanceKm += legDistance;
    totalTravelTimeMin += legTravelTime;
    totalVisitTimeMin += parseVisitDurationMinutes(stop.visitDuration);

    currentLat = stop.lat;
    currentLon = stop.lon;
    currentName = stop.name;
  });

  // Selected mode user-facing time display
  let selectedModeTimeDisplay: string;
  if (preferredMode === 'bus') {
    selectedModeTimeDisplay = 'Unavailable';
  } else if (legs.length === 1 && legs[0].transportComparison) {
    selectedModeTimeDisplay = legs[0].transportComparison.modes[preferredMode].travelTimeDisplay;
  } else {
    selectedModeTimeDisplay = `${totalTravelTimeMin} min`;
  }

  // Multi-stop sum of per-leg fare estimates
  const fareSummary = computeTripFareSummary(
    legs.map((l) => ({ fromName: l.fromName, toName: l.toName, distanceKm: l.distanceKm })),
    preferredMode
  );
  const totalEstimatedTransportCostInr = Math.round((fareSummary.totalMinFareInr + fareSummary.totalMaxFareInr) / 2);

  return {
    origin,
    stops,
    legs,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalTravelTimeMin,
    totalVisitTimeMin,
    totalEstimatedDurationMin: totalTravelTimeMin + totalVisitTimeMin,
    preferredMode,
    totalEstimatedTransportCostInr,
    isOptimized,
    distanceSavedKm: Math.round(distanceSavedKm * 10) / 10,
    selectedModeTimeDisplay,
    fareSummary,
    selectedModeFareDisplay: fareSummary.totalFareDisplay,
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

