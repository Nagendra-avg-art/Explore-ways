/**
 * Phase 9.3: Centralized Transport Fare Estimation Service
 * 
 * Provides transparent, configurable distance-based fare estimation models.
 * Rules & Data Honesty:
 * 1. Never claim "Live fare", "Exact fare", or "Current Ola/Uber price".
 * 2. Walking is always ₹0 (Free).
 * 3. Auto Rickshaw and Cab use configurable distance-based models with realistic uncertainty ranges.
 * 4. Bus / Metro is marked as "Unavailable" (or "Estimated / unavailable") since GTFS fare matrices are not connected.
 * 5. Multi-stop routes calculate fares PER ROUTE LEG, and then sum legs to produce the trip total.
 * 6. Centralized configuration allows adjustments without altering UI components.
 */

import { TransportMode, FareEstimate, LegFareComparison, TripFareSummary } from '../types/travel';

export interface AutoFareConfig {
  baseFare: number; // ₹35 for first 1.5 km
  baseDistanceKm: number; // 1.5 km
  perKmRateCity: number; // ₹16/km
  perKmRateIntercity: number; // ₹14/km for distance > 50km
  varianceMin: number; // 0.95
  varianceMax: number; // 1.25
  minimumFare: number; // ₹35
  assumptions: string;
}

export interface CabFareConfig {
  baseFare: number; // ₹75 for first 2.0 km
  baseDistanceKm: number; // 2.0 km
  perKmRateCity: number; // ₹18/km
  perKmRateIntercity: number; // ₹15/km for distance > 50km
  varianceMin: number; // 0.95
  varianceMax: number; // 1.30
  minimumFare: number; // ₹75
  assumptions: string;
}

export const CENTRALIZED_FARE_CONFIG = {
  auto: {
    baseFare: 35,
    baseDistanceKm: 1.5,
    perKmRateCity: 16,
    perKmRateIntercity: 14,
    varianceMin: 0.95,
    varianceMax: 1.25,
    minimumFare: 35,
    assumptions: 'Configured city auto meter: Base ₹35 for first 1.5 km + ₹16/km with traffic range. Excludes night surcharge. Not a live booking quote.',
  } as AutoFareConfig,
  cab: {
    baseFare: 75,
    baseDistanceKm: 2.0,
    perKmRateCity: 18,
    perKmRateIntercity: 15,
    varianceMin: 0.95,
    varianceMax: 1.30,
    minimumFare: 75,
    assumptions: 'Configured economy cab model: Base ₹75 for first 2 km + ₹18/km with traffic buffer. Excludes live surge pricing, tolls, and peak multipliers.',
  } as CabFareConfig,
  bus: {
    assumptions: 'Public transit fare data not connected. Fares depend on state RTC / metro token slabs. Currently unavailable without live route schedules.',
  },
  walk: {
    assumptions: 'Walking is always free (₹0).',
  },
};

/**
 * Rounds a fare number sensibly to avoid false precision (e.g. ₹137 -> ₹140, ₹8271 -> ₹8300).
 */
function roundFare(val: number): number {
  if (val <= 100) {
    return Math.round(val / 5) * 5;
  }
  if (val <= 1000) {
    return Math.round(val / 10) * 10;
  }
  return Math.round(val / 50) * 50;
}

/**
 * Calculates mode-by-mode fare estimates for a specific route leg distance in km.
 */
export function computeFareEstimates(distanceKm: number): {
  walk: FareEstimate;
  auto: FareEstimate;
  cab: FareEstimate;
  bus: FareEstimate;
} {
  const safeDistance = Math.max(0.1, Math.round(distanceKm * 10) / 10);

  // 1. Walking: Always Free (₹0)
  const walkEstimate: FareEstimate = {
    mode: 'walk',
    modeLabel: 'Walking',
    isAvailable: true,
    minFareInr: 0,
    maxFareInr: 0,
    fareDisplay: 'Free',
    isEstimate: false,
    currency: 'INR',
    assumptions: CENTRALIZED_FARE_CONFIG.walk.assumptions,
    breakdown: {
      baseFare: 0,
      distanceComponent: 0,
    },
  };

  // 2. Auto Rickshaw: Configurable distance-based calculation
  const autoCfg = CENTRALIZED_FARE_CONFIG.auto;
  let autoBaseCalc: number;
  let autoBaseComponent = autoCfg.baseFare;
  let autoDistComponent = 0;

  if (safeDistance <= autoCfg.baseDistanceKm) {
    autoBaseCalc = autoCfg.baseFare;
    autoDistComponent = 0;
  } else if (safeDistance <= 50) {
    // City trip
    autoDistComponent = (safeDistance - autoCfg.baseDistanceKm) * autoCfg.perKmRateCity;
    autoBaseCalc = autoBaseComponent + autoDistComponent;
  } else {
    // Intercity / long haul
    autoBaseComponent = autoCfg.baseFare;
    autoDistComponent = safeDistance * autoCfg.perKmRateIntercity;
    autoBaseCalc = autoDistComponent;
  }

  const autoMin = Math.max(autoCfg.minimumFare, roundFare(autoBaseCalc * autoCfg.varianceMin));
  const autoMax = Math.max(autoMin + 15, roundFare(autoBaseCalc * autoCfg.varianceMax));

  const autoEstimate: FareEstimate = {
    mode: 'auto',
    modeLabel: 'Auto Rickshaw',
    isAvailable: true,
    minFareInr: autoMin,
    maxFareInr: autoMax,
    fareDisplay: `₹${autoMin.toLocaleString('en-IN')}–₹${autoMax.toLocaleString('en-IN')} estimated`,
    isEstimate: true,
    currency: 'INR',
    assumptions: autoCfg.assumptions,
    breakdown: {
      baseFare: autoBaseComponent,
      distanceComponent: Math.round(autoDistComponent),
    },
  };

  // 3. Cab: Configurable distance-based calculation
  const cabCfg = CENTRALIZED_FARE_CONFIG.cab;
  let cabBaseCalc: number;
  let cabBaseComponent = cabCfg.baseFare;
  let cabDistComponent = 0;

  if (safeDistance <= cabCfg.baseDistanceKm) {
    cabBaseCalc = cabCfg.baseFare;
    cabDistComponent = 0;
  } else if (safeDistance <= 50) {
    // City trip
    cabDistComponent = (safeDistance - cabCfg.baseDistanceKm) * cabCfg.perKmRateCity;
    cabBaseCalc = cabBaseComponent + cabDistComponent;
  } else {
    // Intercity outstation
    cabBaseComponent = cabCfg.baseFare;
    cabDistComponent = safeDistance * cabCfg.perKmRateIntercity;
    cabBaseCalc = cabDistComponent;
  }

  const cabMin = Math.max(cabCfg.minimumFare, roundFare(cabBaseCalc * cabCfg.varianceMin));
  const cabMax = Math.max(cabMin + 25, roundFare(cabBaseCalc * cabCfg.varianceMax));

  const cabEstimate: FareEstimate = {
    mode: 'cab',
    modeLabel: 'Cab (Ola/Uber)',
    isAvailable: true,
    minFareInr: cabMin,
    maxFareInr: cabMax,
    fareDisplay: `₹${cabMin.toLocaleString('en-IN')}–₹${cabMax.toLocaleString('en-IN')} estimated`,
    isEstimate: true,
    currency: 'INR',
    assumptions: cabCfg.assumptions,
    breakdown: {
      baseFare: cabBaseComponent,
      distanceComponent: Math.round(cabDistComponent),
    },
  };

  // 4. Bus / Metro: Transparently marked unavailable without GTFS line data
  const busEstimate: FareEstimate = {
    mode: 'bus',
    modeLabel: 'Bus / Metro',
    isAvailable: false,
    minFareInr: 0,
    maxFareInr: 0,
    fareDisplay: 'Unavailable',
    isEstimate: false,
    currency: 'INR',
    assumptions: CENTRALIZED_FARE_CONFIG.bus.assumptions,
  };

  return {
    walk: walkEstimate,
    auto: autoEstimate,
    cab: cabEstimate,
    bus: busEstimate,
  };
}

/**
 * Builds a structured fare comparison object for a specific route leg between two places.
 */
export function buildLegFareComparison(
  fromName: string,
  toName: string,
  distanceKm: number
): LegFareComparison {
  return {
    fromName,
    toName,
    distanceKm,
    modes: computeFareEstimates(distanceKm),
  };
}

/**
 * Calculates multi-stop trip fare by summing the fares of each individual leg.
 * Does NOT calculate one single fake fare from total distance.
 * Leg 1 fare + Leg 2 fare + ... = Total estimated fare.
 */
export function computeTripFareSummary(
  legs: { fromName: string; toName: string; distanceKm: number }[],
  preferredMode: TransportMode
): TripFareSummary {
  if (legs.length === 0) {
    return {
      preferredMode,
      totalMinFareInr: 0,
      totalMaxFareInr: 0,
      totalFareDisplay: preferredMode === 'walk' ? 'Free (₹0)' : '₹0',
      currency: 'INR',
      isEstimate: false,
      assumptions: 'No legs in trip.',
      legs: [],
    };
  }

  const legSummaries = legs.map((leg, index) => {
    const legFares = computeFareEstimates(leg.distanceKm);
    const chosenFare = legFares[preferredMode];
    return {
      legIndex: index,
      fromName: leg.fromName,
      toName: leg.toName,
      distanceKm: leg.distanceKm,
      fare: chosenFare,
    };
  });

  if (preferredMode === 'walk') {
    return {
      preferredMode: 'walk',
      totalMinFareInr: 0,
      totalMaxFareInr: 0,
      totalFareDisplay: 'Free (₹0)',
      currency: 'INR',
      isEstimate: false,
      assumptions: CENTRALIZED_FARE_CONFIG.walk.assumptions,
      legs: legSummaries,
    };
  }

  if (preferredMode === 'bus') {
    return {
      preferredMode: 'bus',
      totalMinFareInr: 0,
      totalMaxFareInr: 0,
      totalFareDisplay: 'Unavailable',
      currency: 'INR',
      isEstimate: false,
      assumptions: CENTRALIZED_FARE_CONFIG.bus.assumptions,
      legs: legSummaries,
    };
  }

  // Sum min and max across all legs
  const totalMin = legSummaries.reduce((acc, l) => acc + l.fare.minFareInr, 0);
  const totalMax = legSummaries.reduce((acc, l) => acc + l.fare.maxFareInr, 0);
  const assumptions = preferredMode === 'auto'
    ? CENTRALIZED_FARE_CONFIG.auto.assumptions
    : CENTRALIZED_FARE_CONFIG.cab.assumptions;

  return {
    preferredMode,
    totalMinFareInr: totalMin,
    totalMaxFareInr: totalMax,
    totalFareDisplay: `₹${totalMin.toLocaleString('en-IN')}–₹${totalMax.toLocaleString('en-IN')} estimated`,
    currency: 'INR',
    isEstimate: true,
    assumptions,
    legs: legSummaries,
  };
}
