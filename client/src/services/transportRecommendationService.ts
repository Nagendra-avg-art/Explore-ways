/**
 * Phase 9.4: Smart Transport Recommendation Engine
 * 
 * Intelligently recommends the most suitable transport mode using a multi-factor
 * deterministic scoring function based on:
 * - User's available time (hours & pace)
 * - User's budget (₹ amount)
 * - Route distance (km)
 * - Travel time (duration min)
 * - Estimated fare (from Phase 9.3)
 * - User's travel style (solo, couple, family, friends)
 * - Transport availability & data quality
 * 
 * Rules:
 * 1. Multi-factor scoring — does NOT simply pick the cheapest or fastest option.
 * 2. Deterministic, transparent, and normalized (0-100).
 * 3. Unavailable modes (e.g. Bus / Metro without GTFS data) are never recommended.
 * 4. Generates concrete, data-driven explanations ("Why Recommended").
 * 5. Supports both individual route legs and multi-stop trips.
 */

import { 
  TransportMode, 
  UserPreferences, 
  FareEstimate, 
  TransportModeRecommendation, 
  TransportRecommendationResult,
  TransportScoreBreakdown 
} from '../types/travel';
import { computeFareEstimates } from './fareEstimationService';
import { computeTransportTimeDetails } from './transportTimeService';

export interface TransportScoringInput {
  distanceKm: number;
  roadDurationMin?: number;
  isRoadNetwork?: boolean;
  preferences: UserPreferences;
  fares?: {
    walk: FareEstimate;
    auto: FareEstimate;
    cab: FareEstimate;
    bus: FareEstimate;
  };
  travelTimes?: {
    walk: { travelTimeMin: number | null; travelTimeDisplay: string };
    auto: { travelTimeMin: number | null; travelTimeDisplay: string };
    cab: { travelTimeMin: number | null; travelTimeDisplay: string };
    bus: { travelTimeMin: number | null; travelTimeDisplay: string };
  };
}

/**
 * 1. Distance Suitability Score (0-100)
 * Evaluates whether a mode makes physical and practical sense for the distance.
 */
function calculateDistanceSuitability(
  mode: TransportMode,
  distanceKm: number,
  travelStyle: UserPreferences['travelStyle']
): number {
  const d = Math.max(0.1, distanceKm);

  switch (mode) {
    case 'walk': {
      // Walking is unviable beyond 5.0 km for tourist sightseeing trips
      if (d > 5.0) return 0;
      let walkScore = 0;
      if (d <= 1.2) walkScore = 100;
      else if (d <= 2.0) walkScore = Math.round(100 - (d - 1.2) * 20); // 1.5km -> 94, 2.0km -> 84
      else if (d <= 3.5) walkScore = Math.round(84 - (d - 2.0) * 25);  // 3.0km -> 59, 3.5km -> 46
      else walkScore = Math.round(46 - (d - 3.5) * 25); // 4km -> 33, 5km -> 8

      // Penalize longer walks if traveling with family/elders/kids
      if (travelStyle === 'family' && d > 1.5) {
        walkScore = Math.round(walkScore * 0.7);
      }
      return Math.max(0, walkScore);
    }
    case 'auto': {
      // Auto is the urban sweet spot in Indian cities (1.0 to 15.0 km)
      if (d < 0.8) return 45; // Overkill for 600m
      if (d <= 1.5) return 80;
      if (d <= 15.0) return 96; // Optimal city auto sweet-spot
      if (d <= 30.0) return Math.round(96 - (d - 15.0) * 1.5); // 25km -> 81
      if (d <= 50.0) return 50;
      return 10; // Intercity highway > 50km is unviable for an auto
    }
    case 'cab': {
      // Cab is great for medium-to-long distances and intercity
      if (d < 1.0) return 30; // Waiting 8 min for a 600m cab ride makes no sense
      if (d <= 2.5) return 65;
      if (d <= 8.0) return 86;
      if (d <= 30.0) return 96; // City AC comfort sweet-spot
      return 100; // Highway outstation journey sweet-spot
    }
    case 'bus':
    default:
      return 0; // Unavailable
  }
}

/**
 * 2. Time Fit Score (0-100)
 * Evaluates duration vs user available hours, schedule buffer, and travel pace.
 */
function calculateTimeFit(
  mode: TransportMode,
  durationMin: number,
  walkDurationMin: number,
  availableHours: number,
  pace: UserPreferences['pace']
): number {
  if (durationMin <= 0) return 0;

  const totalAvailableMin = Math.max(60, availableHours * 60);
  const timeConsumedFraction = durationMin / totalAvailableMin;

  // If this single trip leg consumes > 50% of the entire schedule, score drops sharply
  let baseScore: number;
  if (timeConsumedFraction <= 0.08) {
    baseScore = 96;
  } else if (timeConsumedFraction <= 0.20) {
    baseScore = 88;
  } else if (timeConsumedFraction <= 0.35) {
    baseScore = 72;
  } else if (timeConsumedFraction <= 0.60) {
    baseScore = 45;
  } else {
    baseScore = Math.max(5, Math.round(45 - (timeConsumedFraction - 0.60) * 100));
  }

  // Speed advantage relative to walking for motorized modes
  if (mode === 'auto' || mode === 'cab') {
    const timeSavedMin = Math.max(0, walkDurationMin - durationMin);
    if (timeSavedMin >= 20) {
      baseScore = Math.min(100, baseScore + (pace === 'fast' ? 12 : 8));
    }
  }

  // Pace adjustments
  if (pace === 'fast') {
    if (mode === 'cab') baseScore = Math.min(100, baseScore + 6);
    if (mode === 'auto') baseScore = Math.min(100, baseScore + 4);
    if (mode === 'walk' && durationMin > 25) baseScore = Math.max(5, baseScore - 15);
  } else if (pace === 'relaxed') {
    if (mode === 'walk' && timeConsumedFraction <= 0.25) {
      baseScore = Math.min(100, baseScore + 8);
    }
  }

  return Math.min(100, Math.max(0, Math.round(baseScore)));
}

/**
 * 3. Budget Fit Score (0-100)
 * Evaluates estimated fare against user configured budget amount.
 */
function calculateBudgetFit(
  mode: TransportMode,
  minFareInr: number,
  maxFareInr: number,
  budgetAmount: number,
  distanceKm: number
): number {
  if (mode === 'walk') {
    return 100; // Free (₹0) is always a 100% perfect budget fit
  }

  if (mode === 'bus') {
    return 0; // Unavailable
  }

  const safeBudget = Math.max(100, budgetAmount);
  const midFare = (minFareInr + maxFareInr) / 2;
  const ratio = midFare / safeBudget;

  if (ratio <= 0.08) return 96; // Takes < 8% of budget
  if (ratio <= 0.20) return Math.round(96 - (ratio - 0.08) * 90); // 15% -> ~90
  if (ratio <= 0.40) return Math.round(85 - (ratio - 0.20) * 80); // 30% -> ~77
  if (ratio <= 0.65) return Math.round(69 - (ratio - 0.40) * 75); // 50% -> ~61
  if (ratio <= 0.90) return Math.round(50 - (ratio - 0.65) * 80); // 80% -> ~38
  if (ratio <= 1.10) return 30; // Consumes virtually the entire trip budget

  // On intercity routes (> 50 km), cab is the primary viable vehicle on highways
  if (distanceKm > 50 && mode === 'cab') {
    return Math.max(30, Math.round(60 - Math.min(30, (ratio - 1.10) * 4)));
  }

  return 5; // Exceeds entire trip budget
}

/**
 * 4. Travel Style Fit Score (0-100)
 * Evaluates alignment with solo, couple, family, or friends travel style.
 */
function calculateStyleFit(
  mode: TransportMode,
  travelStyle: UserPreferences['travelStyle']
): number {
  switch (travelStyle) {
    case 'family':
      // Family strongly values AC comfort, seating room for luggage/elders/kids
      if (mode === 'cab') return 96;
      if (mode === 'auto') return 60; // Cramped for 3+ people with bags
      if (mode === 'walk') return 50; // Kids and elders get tired quickly
      return 0;

    case 'couple':
      // Couple appreciates private comfortable AC ride or romantic walk
      if (mode === 'cab') return 92;
      if (mode === 'auto') return 82;
      if (mode === 'walk') return 80;
      return 0;

    case 'friends':
      // Groups of friends love splitting autos and cabs
      if (mode === 'auto') return 92;
      if (mode === 'cab') return 88;
      if (mode === 'walk') return 82;
      return 0;

    case 'solo':
    default:
      // Solo traveler thrives in agile auto rickshaws or pedestrian walks
      if (mode === 'auto') return 96;
      if (mode === 'walk') return 88;
      if (mode === 'cab') return 80;
      return 0;
  }
}

/**
 * 5. Availability & Data Quality Score (0-100)
 */
function calculateAvailabilityScore(mode: TransportMode, isAvailable: boolean): number {
  if (!isAvailable) return 0;
  if (mode === 'walk') return 100;
  if (mode === 'auto') return 95;
  if (mode === 'cab') return 90;
  return 0;
}

/**
 * Generates transparent, data-driven bullet points explaining why a mode is recommended.
 */
function generateMatchReasons(
  mode: TransportMode,
  distanceKm: number,
  durationMin: number,
  walkDurationMin: number,
  fare: FareEstimate,
  preferences: UserPreferences
): { tagline: string; reasons: string[] } {
  const reasons: string[] = [];
  let tagline = 'Recommended Option';

  const midFare = Math.round((fare.minFareInr + fare.maxFareInr) / 2);
  const budgetPct = Math.round((midFare / Math.max(1, preferences.budgetAmount)) * 100);
  const timeSaved = Math.max(0, walkDurationMin - durationMin);

  if (mode === 'walk') {
    tagline = 'Zero-Cost Pedestrian Stroll';
    reasons.push(`100% Free (₹0) — leaves your entire ₹${preferences.budgetAmount.toLocaleString('en-IN')} budget intact for sights and dining.`);
    if (distanceKm <= 1.5) {
      reasons.push(`Short pedestrian distance (${distanceKm} km) taking only ~${durationMin} min.`);
    } else {
      reasons.push(`Walkable distance (${distanceKm} km) within your flexible schedule.`);
    }
    reasons.push(`Pleasant pace that avoids traffic congestion and lets you experience the street atmosphere.`);
  } else if (mode === 'auto') {
    tagline = 'Best Balance of Travel Time & Budget';
    if (budgetPct <= 30) {
      reasons.push(`Comfortably fits your ₹${preferences.budgetAmount.toLocaleString('en-IN')} budget (~${budgetPct}% of budget).`);
    } else {
      reasons.push(`Economical metered rate (${fare.fareDisplay}) compared to a cab.`);
    }

    if (timeSaved >= 15) {
      reasons.push(`Saves ~${timeSaved} min compared to walking (~${durationMin}m vs ~${walkDurationMin}m).`);
    } else {
      reasons.push(`Quick transit taking ~${durationMin} min for this ${distanceKm} km route.`);
    }

    reasons.push(`Optimal sweet-spot vehicle for city roads and agile urban navigation.`);

    if (preferences.travelStyle === 'solo') {
      reasons.push(`Matches solo travel style for quick, flexible point-to-point hops.`);
    }
  } else if (mode === 'cab') {
    tagline = distanceKm > 30 ? 'Fastest & Most Reliable Intercity Option' : 'Fastest & Most Comfortable Transit';
    if (preferences.travelStyle === 'family' || preferences.travelStyle === 'couple') {
      reasons.push(`Air-conditioned private comfort well-suited for ${preferences.travelStyle} travel.`);
    } else {
      reasons.push(`Direct, private, and weatherproof door-to-door transit.`);
    }

    if (timeSaved >= 20) {
      reasons.push(`Saves ~${timeSaved} min compared to walking, maximizing your sightseeing hours.`);
    }

    reasons.push(`Fits within your budget (${fare.fareDisplay} vs ₹${preferences.budgetAmount.toLocaleString('en-IN')}).`);

    if (distanceKm > 15) {
      reasons.push(`Significantly more comfortable for longer highway/arterial distance (${distanceKm} km).`);
    }
  } else {
    tagline = 'Public Transit (Currently Unavailable)';
    reasons.push('Live GTFS bus/metro schedule matrices are not yet connected for this pair.');
  }

  return { tagline, reasons };
}

/**
 * Core Deterministic Scoring & Recommendation Function
 */
export function recommendTransportMode(input: TransportScoringInput): TransportRecommendationResult {
  const { distanceKm, roadDurationMin, preferences } = input;
  const isRoad = input.isRoadNetwork ?? true;

  // Resolve fares and times if not provided
  const fares = input.fares ?? computeFareEstimates(distanceKm);
  const times = input.travelTimes ?? computeTransportTimeDetails(distanceKm, roadDurationMin, isRoad);

  const walkDuration = times.walk.travelTimeMin || Math.round(distanceKm * 12);

  // Dynamic Weighting Config
  let wTime = 0.28;
  let wBudget = 0.28;
  let wDistance = 0.24;
  let wStyle = 0.12;
  let wAvailability = 0.08;

  // Nudge weights based on user preferences
  if (preferences.budgetAmount <= 500) {
    wBudget += 0.08;
    wTime -= 0.05;
    wDistance -= 0.03;
  }
  if (preferences.pace === 'fast') {
    wTime += 0.08;
    wBudget -= 0.05;
    wStyle -= 0.03;
  }
  if (preferences.travelStyle === 'family') {
    wStyle += 0.08;
    wDistance += 0.04;
    wBudget -= 0.06;
    wTime -= 0.06;
  }

  const modes: TransportMode[] = ['walk', 'auto', 'cab', 'bus'];

  const modeRecommendations: TransportModeRecommendation[] = modes.map((mode) => {
    const fare = fares[mode];
    const timeDetail = times[mode];
    const durationMin = timeDetail.travelTimeMin ?? 0;
    const isAvailable = fare.isAvailable && durationMin > 0;

    const icon = mode === 'walk' ? '🚶' : mode === 'auto' ? '🛺' : mode === 'cab' ? '🚕' : '🚌';
    const modeLabel = mode === 'walk' ? 'Walking' : mode === 'auto' ? 'Auto Rickshaw' : mode === 'cab' ? 'Cab (Ola/Uber)' : 'Bus / Metro';

    // If completely unavailable (like bus), assign 0 score
    if (!isAvailable) {
      const breakdown: TransportScoreBreakdown = {
        timeScore: 0,
        budgetScore: 0,
        distanceScore: 0,
        styleScore: 0,
        availabilityScore: 0,
      };
      return {
        mode,
        modeLabel,
        icon,
        score: 0,
        tagline: 'Route data currently unavailable',
        matchReasons: ['Fixed public transit schedules and fare slabs are not yet connected for this pair.'],
        isRecommended: false,
        role: 'unavailable',
        scoreBreakdown: breakdown,
        fareEstimate: fare,
        travelTimeMin: 0,
        travelTimeDisplay: 'Unavailable',
        distanceKm,
      };
    }

    // Disqualify walking if distance exceeds practical pedestrian limits (> 5.0 km)
    if (mode === 'walk' && distanceKm > 5.0) {
      const breakdown: TransportScoreBreakdown = {
        timeScore: 0,
        budgetScore: 100,
        distanceScore: 0,
        styleScore: 0,
        availabilityScore: 0,
      };
      return {
        mode,
        modeLabel,
        icon,
        score: 0,
        tagline: 'Route too long for walking',
        matchReasons: [`Route distance (${distanceKm} km) is not practically walkable on this itinerary.`],
        isRecommended: false,
        role: 'unavailable',
        scoreBreakdown: breakdown,
        fareEstimate: fare,
        travelTimeMin: durationMin,
        travelTimeDisplay: timeDetail.travelTimeDisplay,
        distanceKm,
      };
    }

    // Compute component scores (all 0-100)
    const distanceScore = calculateDistanceSuitability(mode, distanceKm, preferences.travelStyle);
    const timeScore = calculateTimeFit(mode, durationMin, walkDuration, preferences.availableHours, preferences.pace);
    const budgetScore = calculateBudgetFit(mode, fare.minFareInr, fare.maxFareInr, preferences.budgetAmount, distanceKm);
    const styleScore = calculateStyleFit(mode, preferences.travelStyle);
    const availabilityScore = calculateAvailabilityScore(mode, isAvailable);

    // Composite weighted score
    const compositeScore = Math.round(
      distanceScore * wDistance +
      timeScore * wTime +
      budgetScore * wBudget +
      styleScore * wStyle +
      availabilityScore * wAvailability
    );

    const { tagline, reasons } = generateMatchReasons(
      mode,
      distanceKm,
      durationMin,
      walkDuration,
      fare,
      preferences
    );

    const scoreBreakdown: TransportScoreBreakdown = {
      timeScore,
      budgetScore,
      distanceScore,
      styleScore,
      availabilityScore,
    };

    return {
      mode,
      modeLabel,
      icon,
      score: compositeScore,
      tagline,
      matchReasons: reasons,
      isRecommended: false,
      role: 'alternative',
      scoreBreakdown,
      fareEstimate: fare,
      travelTimeMin: durationMin,
      travelTimeDisplay: timeDetail.travelTimeDisplay,
      distanceKm,
    };
  });

  // Rank available modes by composite score descending
  const availableRanked = modeRecommendations
    .filter((m) => m.role !== 'unavailable' && m.score > 0)
    .sort((a, b) => b.score - a.score);

  const unavailableModes = modeRecommendations.filter((m) => m.role === 'unavailable' || m.score === 0);

  // Top mode becomes recommended
  const recommended = availableRanked[0] || modeRecommendations[0];
  recommended.isRecommended = true;
  recommended.role = 'recommended';

  // Assign roles to the remaining available choices
  const alternatives = availableRanked.slice(1).map((alt) => {
    if (alt.mode === 'walk') {
      alt.role = 'budget';
      alt.tagline = 'Budget Option — Free (₹0), but takes longer';
    } else if (alt.travelTimeMin < recommended.travelTimeMin) {
      alt.role = 'alternative';
      alt.tagline = 'Faster Alternative — Saves time, higher fare';
    } else {
      alt.role = 'alternative';
    }
    return alt;
  });

  // Budget impact calculations
  const fareMin = recommended.fareEstimate.minFareInr;
  const fareMax = recommended.fareEstimate.maxFareInr;
  const midFare = Math.round((fareMin + fareMax) / 2);
  const remainingMin = Math.max(0, preferences.budgetAmount - fareMax);
  const remainingMax = Math.max(0, preferences.budgetAmount - fareMin);
  const budgetPct = Math.round((midFare / Math.max(1, preferences.budgetAmount)) * 100);

  // Time impact calculations
  const availableMinutes = preferences.availableHours * 60;
  const remainingTimeMinutes = Math.max(0, availableMinutes - recommended.travelTimeMin);
  const timeSavingsVsWalkMin = recommended.mode !== 'walk' ? Math.max(0, walkDuration - recommended.travelTimeMin) : 0;

  const summaryExplanation = `${recommended.modeLabel} is recommended as the ${recommended.tagline.toLowerCase()} for this ${distanceKm} km route. It uses ~${budgetPct}% of your ₹${preferences.budgetAmount.toLocaleString('en-IN')} trip budget and leaves ${Math.floor(remainingTimeMinutes / 60)}h ${remainingTimeMinutes % 60}m for sightseeing.`;

  return {
    recommended,
    alternatives,
    unavailableModes,
    allRanked: [recommended, ...alternatives, ...unavailableModes],
    budgetImpact: {
      tripBudgetInr: preferences.budgetAmount,
      estimatedFareMinInr: fareMin,
      estimatedFareMaxInr: fareMax,
      remainingBudgetMinInr: remainingMin,
      remainingBudgetMaxInr: remainingMax,
      percentOfBudget: budgetPct,
    },
    timeImpact: {
      availableHours: preferences.availableHours,
      availableMinutes,
      transitTimeMinutes: recommended.travelTimeMin,
      remainingTimeMinutes,
      timeSavingsVsWalkMin,
    },
    summaryExplanation,
  };
}

/**
 * Multi-Stop Trip Transport Recommendation
 * Evaluates the entire itinerary trip route (sum of all leg distances, durations, and fares)
 * against the user's overall trip budget and available schedule.
 */
export function recommendTripTransport(
  legs: { distanceKm: number; roadDurationMin?: number }[],
  preferences: UserPreferences
): TransportRecommendationResult {
  const totalDistanceKm = Math.round(legs.reduce((acc, l) => acc + l.distanceKm, 0) * 10) / 10;

  // Compute summed travel times per mode
  let totalWalkMin = 0;
  let totalAutoMin = 0;
  let totalCabMin = 0;

  legs.forEach((leg) => {
    const details = computeTransportTimeDetails(leg.distanceKm, leg.roadDurationMin, true);
    totalWalkMin += details.walk.travelTimeMin || Math.round(leg.distanceKm * 12);
    totalAutoMin += details.auto.travelTimeMin || 5;
    totalCabMin += details.cab.travelTimeMin || 5;
  });

  // Compute summed fares per mode (using centralized per-leg sum)
  let autoMinFare = 0;
  let autoMaxFare = 0;
  let cabMinFare = 0;
  let cabMaxFare = 0;

  legs.forEach((leg) => {
    const legFares = computeFareEstimates(leg.distanceKm);
    autoMinFare += legFares.auto.minFareInr;
    autoMaxFare += legFares.auto.maxFareInr;
    cabMinFare += legFares.cab.minFareInr;
    cabMaxFare += legFares.cab.maxFareInr;
  });

  const tripFares = {
    walk: {
      mode: 'walk' as TransportMode,
      modeLabel: 'Walking',
      isAvailable: true,
      minFareInr: 0,
      maxFareInr: 0,
      fareDisplay: 'Free (₹0)',
      isEstimate: false,
      currency: 'INR',
      assumptions: 'Walking is 100% free.',
    },
    auto: {
      mode: 'auto' as TransportMode,
      modeLabel: 'Auto Rickshaw',
      isAvailable: true,
      minFareInr: autoMinFare,
      maxFareInr: autoMaxFare,
      fareDisplay: `₹${autoMinFare.toLocaleString('en-IN')}–₹${autoMaxFare.toLocaleString('en-IN')} estimated`,
      isEstimate: true,
      currency: 'INR',
      assumptions: 'Sum of per-leg auto meter estimates.',
    },
    cab: {
      mode: 'cab' as TransportMode,
      modeLabel: 'Cab (Ola/Uber)',
      isAvailable: true,
      minFareInr: cabMinFare,
      maxFareInr: cabMaxFare,
      fareDisplay: `₹${cabMinFare.toLocaleString('en-IN')}–₹${cabMaxFare.toLocaleString('en-IN')} estimated`,
      isEstimate: true,
      currency: 'INR',
      assumptions: 'Sum of per-leg economy cab estimates.',
    },
    bus: {
      mode: 'bus' as TransportMode,
      modeLabel: 'Bus / Metro',
      isAvailable: false,
      minFareInr: 0,
      maxFareInr: 0,
      fareDisplay: 'Unavailable',
      isEstimate: false,
      currency: 'INR',
      assumptions: 'Public transit schedule feed not connected.',
    },
  };

  const tripTimes = {
    walk: { travelTimeMin: totalWalkMin, travelTimeDisplay: `${totalWalkMin} min` },
    auto: { travelTimeMin: totalAutoMin, travelTimeDisplay: `${totalAutoMin} min` },
    cab: { travelTimeMin: totalCabMin, travelTimeDisplay: `${totalCabMin} min` },
    bus: { travelTimeMin: null, travelTimeDisplay: 'Unavailable' },
  };

  return recommendTransportMode({
    distanceKm: totalDistanceKm,
    preferences,
    fares: tripFares,
    travelTimes: tripTimes,
  });
}
