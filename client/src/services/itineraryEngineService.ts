/**
 * Smart Itinerary Engine Service (Phase 10)
 * 
 * Deterministic, predictable, and explainable multi-stop itinerary engine.
 * Consumes existing Phase 7 recommendations, Phase 8 routing, and Phase 9 transport fares.
 * 
 * Capabilities:
 * 1. Centralized Visit Duration Estimation (honest source vs fallback distinction)
 * 2. Honest Opening Hours Evaluation (marks missing hours as 'Hours unavailable')
 * 3. Step-by-Step Chronological Timeline Scheduling (Arrival -> Visit -> Departure -> Transit)
 * 4. Time Budget & Schedule Feasibility Evaluation (Feasible, Tight, Infeasible + Actionable Advice)
 * 5. Multi-Factor Route Optimization (Minimizes backtracking while balancing interest score & schedule)
 * 6. Data-Driven "Why this order?" Explanation Generator
 */

import {
  Place,
  UserPreferences,
  TransportMode,
  RouteLeg,
  ItineraryStopSchedule,
  ItinerarySchedule,
  ItineraryFeasibility,
  ItineraryExplanation
} from '../types/travel';
import { calculateHaversineDistanceKm, parseVisitDurationMinutes } from './routingService';

// Centralized category fallback durations (in minutes) when place does not provide explicit visit time
export const CATEGORY_FALLBACK_DURATIONS_MIN: Record<string, number> = {
  temples: 45,
  history: 90,
  food: 45,
  nature: 60,
  architecture: 60,
  shopping: 60,
  cafes: 30,
  photography: 45,
  culture: 60,
  all: 60,
};

export interface VisitDurationResult {
  durationMinutes: number;
  durationDisplay: string;
  isFallback: boolean;
  sourceLabel: string;
}

/**
 * Resolves estimated visit duration for a place.
 * Honestly distinguishes explicit source data from category fallback estimates.
 */
export function getEstimatedVisitDuration(place: Place): VisitDurationResult {
  if (place.visitDuration && place.visitDuration.trim().length > 0) {
    const parsed = parseVisitDurationMinutes(place.visitDuration);
    return {
      durationMinutes: parsed,
      durationDisplay: place.visitDuration,
      isFallback: false,
      sourceLabel: 'Place listing',
    };
  }

  const fallback = CATEGORY_FALLBACK_DURATIONS_MIN[place.category] || 60;
  const hours = Math.floor(fallback / 60);
  const mins = fallback % 60;
  const display = hours > 0 && mins > 0 ? `${hours}h ${mins}m` : hours > 0 ? `${hours} hr` : `${mins} min`;

  return {
    durationMinutes: fallback,
    durationDisplay: `${display} (est.)`,
    isFallback: true,
    sourceLabel: 'Category fallback estimate',
  };
}

export interface OpeningStatusResult {
  status: 'open' | 'closed' | 'unavailable';
  label: string;
  badgeColor: 'emerald' | 'rose' | 'slate';
  detail?: string;
}

/**
 * Evaluates opening hours honestly without inventing missing data.
 */
export function getOpeningStatusInfo(place: Place): OpeningStatusResult {
  if (place.isOpenNow === true) {
    return {
      status: 'open',
      label: 'Open Now',
      badgeColor: 'emerald',
      detail: place.openingHours || 'Confirmed open',
    };
  }
  if (place.isOpenNow === false) {
    return {
      status: 'closed',
      label: 'Currently Closed',
      badgeColor: 'rose',
      detail: place.openingHours || 'Confirmed closed',
    };
  }
  if (place.openingHours && place.openingHours.trim().length > 0) {
    return {
      status: 'open',
      label: place.openingHours,
      badgeColor: 'slate',
      detail: place.openingHours,
    };
  }
  return {
    status: 'unavailable',
    label: 'Hours unavailable',
    badgeColor: 'slate',
    detail: 'Schedule not provided by source',
  };
}

/**
 * Adds minutes to a 24h "HH:MM" time string and returns formatted "HH:MM".
 */
export function addMinutesToTimeString(timeStr: string, minutesToAdd: number): string {
  const parts = timeStr.split(':');
  let h = parseInt(parts[0], 10) || 9;
  let m = parseInt(parts[1], 10) || 0;

  m += Math.round(minutesToAdd);
  h += Math.floor(m / 60);
  m = m % 60;
  if (m < 0) {
    m += 60;
    h -= 1;
  }
  h = ((h % 24) + 24) % 24;

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Computes reasonable buffer time in minutes based on trip size and travel pace.
 */
export function computeTripBufferMinutes(stopsCount: number, pace: string = 'moderate'): number {
  if (stopsCount === 0) return 0;
  const basePerStop = pace === 'relaxed' ? 12 : pace === 'fast' ? 5 : 8;
  const total = Math.min(45, Math.max(15, stopsCount * basePerStop));
  return total;
}

/**
 * Builds chronological schedule for multi-stop itinerary.
 * Default starting time: 09:00 AM.
 */
export function calculateItinerarySchedule(
  stops: Place[],
  legs: RouteLeg[],
  startTimeStr: string = '09:00',
  pace: string = 'moderate'
): ItinerarySchedule {
  if (stops.length === 0) {
    return {
      startTimeStr,
      originDepartureStr: startTimeStr,
      stops: [],
      endTimeStr: startTimeStr,
      totalTravelMin: 0,
      totalVisitMin: 0,
      bufferMin: 0,
      totalTripMin: 0,
    };
  }

  let currentTimeStr = startTimeStr;
  const scheduledStops: ItineraryStopSchedule[] = [];
  let totalTravelMin = 0;
  let totalVisitMin = 0;

  stops.forEach((stop, index) => {
    const leg = legs[index];
    const travelMin = leg ? leg.estimatedTravelTimeMin : 0;
    totalTravelMin += travelMin;

    // Arrival time at stop
    const arrivalTimeStr = addMinutesToTimeString(currentTimeStr, travelMin);

    // Visit duration
    const durInfo = getEstimatedVisitDuration(stop);
    totalVisitMin += durInfo.durationMinutes;

    // Departure time from stop
    const departureTimeStr = addMinutesToTimeString(arrivalTimeStr, durInfo.durationMinutes);

    // Opening status
    const openInfo = getOpeningStatusInfo(stop);

    scheduledStops.push({
      stopIndex: index,
      place: stop,
      arrivalTimeStr,
      departureTimeStr,
      visitDurationMin: durInfo.durationMinutes,
      visitDurationDisplay: durInfo.durationDisplay,
      isFallbackEstimate: durInfo.isFallback,
      durationSourceLabel: durInfo.sourceLabel,
      openStatus: openInfo.status,
      openStatusLabel: openInfo.label,
      openStatusDetail: openInfo.detail,
    });

    currentTimeStr = departureTimeStr;
  });

  const bufferMin = computeTripBufferMinutes(stops.length, pace);
  const totalTripMin = totalTravelMin + totalVisitMin + bufferMin;
  const endTimeStr = addMinutesToTimeString(currentTimeStr, bufferMin);

  return {
    startTimeStr,
    originDepartureStr: startTimeStr,
    stops: scheduledStops,
    endTimeStr,
    totalTravelMin,
    totalVisitMin,
    bufferMin,
    totalTripMin,
  };
}

/**
 * Evaluates whether itinerary fits within user's available time.
 * Categories:
 * - 'feasible': totalTripMinutes <= availableMinutes - 15 (healthy buffer remaining)
 * - 'tight': totalTripMinutes > availableMinutes - 15 && totalTripMinutes <= availableMinutes (minimal buffer)
 * - 'exceeded': totalTripMinutes > availableMinutes (exceeds schedule)
 */
export function calculateItineraryFeasibility(
  schedule: ItinerarySchedule,
  preferences: UserPreferences,
  preferredMode: TransportMode,
  stops: Place[]
): ItineraryFeasibility {
  const availableMinutes = preferences.availableHours * 60;
  const { totalTravelMin, totalVisitMin, bufferMin, totalTripMin } = schedule;

  const diffMinutes = availableMinutes - totalTripMin;
  const remainingMinutes = Math.max(0, diffMinutes);
  const exceededMinutes = Math.max(0, -diffMinutes);

  const hours = Math.floor(totalTripMin / 60);
  const mins = totalTripMin % 60;
  const formattedTotal = hours > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim() : `${mins}m`;

  const suggestions: string[] = [];

  if (diffMinutes >= 10) {
    // Schedule Feasible
    return {
      status: 'feasible',
      statusLabel: 'Schedule Feasible',
      statusBadgeColor: 'emerald',
      availableMinutes,
      totalTravelMinutes: totalTravelMin,
      totalVisitMinutes: totalVisitMin,
      bufferMinutes: bufferMin,
      totalTripMinutes: totalTripMin,
      remainingMinutes,
      exceededMinutes: 0,
      headline: `Schedule Feasible (${remainingMinutes} min buffer remaining)`,
      explanation: `This ${stops.length}-stop itinerary takes ~${formattedTotal} (${totalTravelMin}m travel + ${totalVisitMin}m sightseeing + ${bufferMin}m buffer), fitting comfortably within your ${preferences.availableHours}h schedule.`,
      suggestions: [
        `You have ${remainingMinutes} min of free buffer for local cafes, photography, or unplanned exploration.`,
        'All selected destination visits can be comfortably completed without rushing.',
      ],
    };
  } else if (diffMinutes >= 0) {
    // Tight Schedule
    suggestions.push(`Keep visits strictly within estimated times to avoid exceeding your ${preferences.availableHours}h schedule.`);
    if (preferredMode === 'walk') {
      suggestions.push('Switching to Auto or Cab will reduce transit time and create more buffer.');
    } else {
      suggestions.push('Consider dropping 1 stop if you prefer a more relaxed pace.');
    }

    return {
      status: 'tight',
      statusLabel: 'Tight Schedule',
      statusBadgeColor: 'amber',
      availableMinutes,
      totalTravelMinutes: totalTravelMin,
      totalVisitMinutes: totalVisitMin,
      bufferMinutes: bufferMin,
      totalTripMinutes: totalTripMin,
      remainingMinutes,
      exceededMinutes: 0,
      headline: `Tight Schedule (${remainingMinutes} min buffer remaining)`,
      explanation: `Total trip time is ~${formattedTotal}, which leaves only ${remainingMinutes} min of spare buffer against your ${preferences.availableHours}h schedule. Minor delays may extend your trip.`,
      suggestions,
    };
  } else {
    // Exceeded Schedule
    suggestions.push(`Remove one stop or choose faster transport to fit within ${preferences.availableHours}h.`);
    if (stops.length > 1) {
      // Find stop with lowest matchScore or longest duration
      const candidateToRemove = [...stops].sort((a, b) => {
        const durA = getEstimatedVisitDuration(a).durationMinutes;
        const durB = getEstimatedVisitDuration(b).durationMinutes;
        return durB - durA;
      })[0];
      if (candidateToRemove) {
        suggestions.push(`Removing "${candidateToRemove.name}" would save ~${getEstimatedVisitDuration(candidateToRemove).durationMinutes} min of visit time.`);
      }
    }
    if (preferredMode === 'walk') {
      suggestions.push('Switching from Walking to Auto or Cab can significantly reduce transit time.');
    } else {
      suggestions.push(`Or increase your trip duration in preferences to ${Math.ceil(totalTripMin / 60)} hours.`);
    }

    return {
      status: 'exceeded',
      statusLabel: 'Schedule Not Feasible',
      statusBadgeColor: 'rose',
      availableMinutes,
      totalTravelMinutes: totalTravelMin,
      totalVisitMinutes: totalVisitMin,
      bufferMinutes: bufferMin,
      totalTripMinutes: totalTripMin,
      remainingMinutes: 0,
      exceededMinutes,
      headline: `Schedule Exceeds Available Time (${exceededMinutes} min over)`,
      explanation: `This itinerary takes ~${formattedTotal} (${totalTravelMin}m travel + ${totalVisitMin}m visits + ${bufferMin}m buffer), which exceeds your ${preferences.availableHours}h schedule by ${exceededMinutes} min.`,
      suggestions,
    };
  }
}

/**
 * Computes recommendation score for a place based on user preferences.
 */
export function getPlaceRelevanceScore(place: Place, preferences: UserPreferences): number {
  if (place.matchScore !== undefined) return place.matchScore;
  
  let score = 50;
  if (preferences.interests.includes(place.category)) {
    score += 35;
  }
  if (place.rating && place.rating >= 4.5) {
    score += 15;
  }
  return Math.min(100, score);
}

/**
 * Multi-Factor Smart Itinerary Optimizer.
 * Orders stops to minimize backtracking while balancing:
 * 1. Geographic efficiency (actual route distances)
 * 2. High recommendation score / user interest match
 * 3. Opening hours status
 * 4. Available time & visit durations
 */
export function optimizeSmartItineraryOrder(
  origin: { lat: number; lon: number },
  stops: Place[],
  preferences: UserPreferences,
  _preferredMode: TransportMode = 'auto'
): {
  orderedStops: Place[];
  distanceBeforeKm: number;
  distanceAfterKm: number;
  distanceSavedKm: number;
  isOptimized: boolean;
} {
  if (stops.length <= 1) {
    return {
      orderedStops: [...stops],
      distanceBeforeKm: 0,
      distanceAfterKm: 0,
      distanceSavedKm: 0,
      isOptimized: false,
    };
  }

  // Calculate distance of original order
  let distanceBeforeKm = 0;
  let curLat = origin.lat;
  let curLon = origin.lon;
  for (const s of stops) {
    distanceBeforeKm += calculateHaversineDistanceKm(curLat, curLon, s.lat, s.lon);
    curLat = s.lat;
    curLon = s.lon;
  }

  // Helper to score an ordering
  // Lower score is better
  const evaluateOrderCost = (seq: Place[]): number => {
    let totalDist = 0;
    let lat = origin.lat;
    let lon = origin.lon;

    for (let i = 0; i < seq.length; i++) {
      const p = seq[i];
      const legDist = calculateHaversineDistanceKm(lat, lon, p.lat, p.lon);
      totalDist += legDist;
      lat = p.lat;
      lon = p.lon;
    }

    // Secondary factors (small normalized adjustments to break ties or favor highlights first)
    // 1. High interest match earlier in trip: modest distance credit (up to 0.8 km per stop)
    let interestBonusKm = 0;
    seq.forEach((p, idx) => {
      const relScore = getPlaceRelevanceScore(p, preferences);
      // earlier stops get higher weight
      const rankWeight = (seq.length - idx) / seq.length;
      interestBonusKm += (relScore / 100) * rankWeight * 0.4;
    });

    // 2. Penalty for placing closed places first
    let closedPenaltyKm = 0;
    if (seq[0].isOpenNow === false) {
      closedPenaltyKm += 2.5; // Avoid scheduling closed place first if alternative exists
    }

    return totalDist - interestBonusKm + closedPenaltyKm;
  };

  let bestSequence: Place[] = [...stops];
  let bestCost = evaluateOrderCost(bestSequence);

  // If stops <= 7, perform exact exhaustive search across all permutations (n! <= 5040)
  if (stops.length <= 7) {
    const permute = (arr: Place[], m: Place[] = []) => {
      if (arr.length === 0) {
        const cost = evaluateOrderCost(m);
        if (cost < bestCost) {
          bestCost = cost;
          bestSequence = [...m];
        }
      } else {
        for (let i = 0; i < arr.length; i++) {
          const curr = arr.slice();
          const next = curr.splice(i, 1);
          permute(curr.slice(), m.concat(next));
        }
      }
    };
    permute(stops);
  } else {
    // Greedy nearest-neighbor with multi-factor heuristic + 2-opt swaps
    const unvisited = [...stops];
    const greedySeq: Place[] = [];
    let curL = origin.lat;
    let curO = origin.lon;

    while (unvisited.length > 0) {
      let bestIdx = 0;
      let minGreedyCost = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const cand = unvisited[i];
        const d = calculateHaversineDistanceKm(curL, curO, cand.lat, cand.lon);
        const rel = getPlaceRelevanceScore(cand, preferences);
        // Multi-factor step cost
        const stepCost = d - (rel / 100) * 0.5 + (cand.isOpenNow === false && greedySeq.length === 0 ? 3 : 0);
        if (stepCost < minGreedyCost) {
          minGreedyCost = stepCost;
          bestIdx = i;
        }
      }

      const next = unvisited.splice(bestIdx, 1)[0];
      greedySeq.push(next);
      curL = next.lat;
      curO = next.lon;
    }

    bestSequence = greedySeq;
    bestCost = evaluateOrderCost(bestSequence);

    // 2-opt refinement swaps
    let improved = true;
    let passes = 0;
    while (improved && passes < 10) {
      improved = false;
      passes++;
      for (let i = 0; i < bestSequence.length - 1; i++) {
        for (let k = i + 1; k < bestSequence.length; k++) {
          const candidate = [
            ...bestSequence.slice(0, i),
            ...bestSequence.slice(i, k + 1).reverse(),
            ...bestSequence.slice(k + 1),
          ];
          const cost = evaluateOrderCost(candidate);
          if (cost < bestCost - 0.05) {
            bestCost = cost;
            bestSequence = candidate;
            improved = true;
          }
        }
      }
    }
  }

  // Calculate distance after optimization
  let distanceAfterKm = 0;
  curLat = origin.lat;
  curLon = origin.lon;
  for (const s of bestSequence) {
    distanceAfterKm += calculateHaversineDistanceKm(curLat, curLon, s.lat, s.lon);
    curLat = s.lat;
    curLon = s.lon;
  }

  const distanceSavedKm = Math.max(0, distanceBeforeKm - distanceAfterKm);

  return {
    orderedStops: bestSequence,
    distanceBeforeKm: Math.round(distanceBeforeKm * 10) / 10,
    distanceAfterKm: Math.round(distanceAfterKm * 10) / 10,
    distanceSavedKm: Math.round(distanceSavedKm * 10) / 10,
    isOptimized: true,
  };
}

/**
 * Generates transparent, data-driven "Why this order?" explanations.
 * Derives bullets strictly from actual calculated coordinates, scores, and schedule facts.
 */
export function generateItineraryExplanation(
  origin: { label: string; lat: number; lon: number },
  stops: Place[],
  legs: RouteLeg[],
  preferences: UserPreferences,
  preferredMode: TransportMode,
  feasibility: ItineraryFeasibility,
  distanceSavedKm: number = 0
): ItineraryExplanation {
  if (stops.length === 0) {
    return {
      overallReason: 'No stops currently planned.',
      stopReasons: [],
      transportReason: '',
      efficiencyReason: '',
    };
  }

  const stopReasons: { stopIndex: number; placeId: string; placeName: string; reason: string }[] = [];

  // Stop 1 explanation
  const stop1 = stops[0];
  const leg0 = legs[0];
  const dist0 = leg0 ? leg0.distanceKm : calculateHaversineDistanceKm(origin.lat, origin.lon, stop1.lat, stop1.lon);
  const match1 = getPlaceRelevanceScore(stop1, preferences);

  let stop1Reason = '';
  if (preferences.interests.includes(stop1.category)) {
    stop1Reason = `Scheduled first: aligns strongly with your interest in "${stop1.categoryLabel || stop1.category}" (${match1}% match) and provides an efficient initial departure (${dist0} km from ${origin.label}).`;
  } else {
    stop1Reason = `Scheduled first: closest practical starting stop from ${origin.label} (${dist0} km) to begin the route without detours.`;
  }
  if (stop1.isOpenNow === true) {
    stop1Reason += ' Confirmed open now for early entry.';
  }

  stopReasons.push({
    stopIndex: 0,
    placeId: stop1.id,
    placeName: stop1.name,
    reason: stop1Reason,
  });

  // Subsequent stops explanation
  for (let i = 1; i < stops.length; i++) {
    const prev = stops[i - 1];
    const curr = stops[i];
    const leg = legs[i];
    const dist = leg ? leg.distanceKm : calculateHaversineDistanceKm(prev.lat, prev.lon, curr.lat, curr.lon);

    let reason = `Follows ${prev.name}: located ${dist} km away along the route corridor to minimize backtracking.`;
    if (preferences.interests.includes(curr.category)) {
      reason += ` Matches your preference for ${curr.categoryLabel || curr.category}.`;
    }

    stopReasons.push({
      stopIndex: i,
      placeId: curr.id,
      placeName: curr.name,
      reason,
    });
  }

  // Transport reason
  const modeLabels: Record<TransportMode, string> = {
    walk: 'Walking',
    auto: 'Auto Rickshaw',
    cab: 'Cab (Ola/Uber)',
    bus: 'Bus / Metro',
  };
  let transportReason = `${modeLabels[preferredMode]} was selected for itinerary transit legs`;
  if (preferredMode === 'auto') {
    transportReason += ` to balance speed (${feasibility.totalTravelMinutes}m transit) and budget efficiency.`;
  } else if (preferredMode === 'cab') {
    transportReason += ` for fast, comfortable point-to-point transit (${feasibility.totalTravelMinutes}m transit).`;
  } else if (preferredMode === 'walk') {
    transportReason += ` for zero transit cost (₹0), ideal for compact pedestrian sights.`;
  } else {
    transportReason += ` based on your transit mode selection.`;
  }

  // Efficiency reason
  let efficiencyReason = '';
  if (distanceSavedKm > 0) {
    efficiencyReason = `Route optimization eliminated backtracking, saving ~${distanceSavedKm} km of travel compared to original sequence.`;
  } else {
    efficiencyReason = `Stops follow a sequential progression from ${origin.label} through destinations without unnecessary loop-backs.`;
  }

  // Overall summary
  const overallReason = `Itinerary is structured for geographic flow and interest priority, completing ${stops.length} stops in ~${Math.round(feasibility.totalTripMinutes / 60 * 10) / 10} hours.`;

  return {
    overallReason,
    stopReasons,
    transportReason,
    efficiencyReason,
  };
}
