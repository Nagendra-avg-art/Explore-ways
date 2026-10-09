import React, { useState, useMemo } from 'react';
import { 
  Navigation, 
  Sparkles, 
  MapPin, 
  ArrowDown, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  Map as MapIcon, 
  CheckCircle2, 
  RotateCcw, 
  Plus, 
  Info, 
  ExternalLink, 
  Compass, 
  Utensils, 
  Clock,
  AlertTriangle,
  Bot,
  Wallet,
  ShieldCheck
} from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useLocation } from '../../context/LocationContext';
import { Place, TransportMode } from '../../types/travel';
import { formatDistanceKm } from '../../services/routingService';
import { recommendTripTransport } from '../../services/transportRecommendationService';
import { computeTripFareSummary } from '../../services/fareEstimationService';
import {
  calculateItinerarySchedule,
  calculateItineraryFeasibility,
  generateItineraryExplanation,
} from '../../services/itineraryEngineService';
import { useWeather } from '../../context/WeatherContext';
import { WeatherTripAlert } from '../weather';
import { calculateWeatherTripImpact } from '../../services/weatherImpactService';

interface TripRouteViewProps {
  onViewPlaceDetails: (place: Place) => void;
  onNavigateToMap: () => void;
  onExploreMore: () => void;
  onNavigateToFood?: () => void;
  onNavigateToAI?: (initialPrompt?: string) => void;
}

const MODE_CONFIG: Record<TransportMode, {
  label: string;
  icon: string;
  summaryHeadline: string;
  defaultReason: string;
}> = {
  walk: {
    label: 'Walking',
    icon: '🚶',
    summaryHeadline: 'Pedestrian stroll — 100% free of charge',
    defaultReason: 'Best for saving money, but increases travel time.',
  },
  auto: {
    label: 'Auto Rickshaw',
    icon: '🛺',
    summaryHeadline: 'Best balance of travel time and budget',
    defaultReason: 'Economical point-to-point urban transit with standard metered rates.',
  },
  cab: {
    label: 'Cab (Ola/Uber)',
    icon: '🚕',
    summaryHeadline: 'Fastest & most comfortable transit',
    defaultReason: 'Ideal for faster travel, group comfort, or longer route distances.',
  },
  bus: {
    label: 'Bus / Metro',
    icon: '🚌',
    summaryHeadline: 'Public transit option (schedules unlinked)',
    defaultReason: 'Public transit schedule feeds are currently not connected for this corridor.',
  },
};

const AI_QUICK_QUESTIONS = [
  'Is this trip worth doing?',
  'Can I add another place?',
  'Why is this the best order?',
  'How much will the trip cost?',
  'Will rain affect my trip?',
];

export const TripRouteView: React.FC<TripRouteViewProps> = ({
  onViewPlaceDetails,
  onNavigateToMap,
  onExploreMore,
  onNavigateToFood,
  onNavigateToAI,
}) => {
  // 1. Context Hooks
  const {
    tripPlaces,
    tripRoute,
    removeFromTrip,
    moveStopUp,
    moveStopDown,
    optimizeTripRoute,
    resetToManualOrder,
    isOptimized,
    distanceSavedKm,
    clearTrip,
    selectedTransport,
    setSelectedTransport,
    recommendedTransport,
    activeTransport,
    resetToRecommendedTransport,
    reorderTripStops,
  } = useTrip();

  const { preferences } = usePreferences();
  const { location } = useLocation();
  const { weather } = useWeather();

  // 2. UI State Hooks
  const [showTransportDetails, setShowTransportDetails] = useState<boolean>(false);
  const [showWhyOrder, setShowWhyOrder] = useState<boolean>(false);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState<boolean>(false);
  const [expandedManeuversLegIndex, setExpandedManeuversLegIndex] = useState<number | null>(null);

  // 3. Transport Recommendation
  const tripRecommendation = useMemo(() => {
    if (tripPlaces.length === 0 || tripRoute.legs.length === 0) return null;
    return recommendTripTransport(
      tripRoute.legs.map((l) => ({ distanceKm: l.distanceKm, roadDurationMin: l.estimatedTravelTimeMin })),
      preferences
    );
  }, [tripPlaces.length, tripRoute.legs, preferences]);

  // Recommended Mode vs User Explicit Selection
  const recommendedMode: TransportMode = tripRecommendation?.recommended?.mode ?? recommendedTransport ?? 'auto';
  const isCustomSelected = selectedTransport !== null && selectedTransport !== recommendedMode;

  // Schedule Engine
  const schedule = useMemo(() => {
    if (tripRoute.schedule) return tripRoute.schedule;
    return calculateItinerarySchedule(tripPlaces, tripRoute.legs, '09:00', preferences.pace);
  }, [tripRoute.schedule, tripPlaces, tripRoute.legs, preferences.pace]);

  // Weather Impact Engine
  const weatherImpact = useMemo(() => {
    return calculateWeatherTripImpact(
      weather,
      tripPlaces,
      schedule,
      activeTransport,
      tripRoute.legs
    );
  }, [weather, tripPlaces, schedule, activeTransport, tripRoute.legs]);

  // Feasibility Engine
  const feasibility = useMemo(() => {
    if (tripRoute.feasibility) return tripRoute.feasibility;
    return calculateItineraryFeasibility(schedule, preferences, activeTransport, tripPlaces);
  }, [tripRoute.feasibility, schedule, preferences, activeTransport, tripPlaces]);

  // Itinerary Explanation
  const itineraryExplanation = useMemo(() => {
    if (tripRoute.itineraryExplanation) return tripRoute.itineraryExplanation;
    return generateItineraryExplanation(
      tripRoute.origin,
      tripPlaces,
      tripRoute.legs,
      preferences,
      activeTransport,
      feasibility,
      distanceSavedKm
    );
  }, [tripRoute.itineraryExplanation, tripRoute.origin, tripPlaces, tripRoute.legs, preferences, activeTransport, feasibility, distanceSavedKm]);

  // Time metrics
  const totalMin = feasibility ? feasibility.totalTripMinutes : 0;
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  const formattedTotalTime = hours > 0 ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}` : `${minutes} min`;

  const destinationCity = location?.city || 'Your Destination';
  const startPointLabel = location?.area 
    ? `${location.area}, ${location.city}` 
    : (location?.city || tripRoute?.origin?.label || 'Starting Location');

  // Formatted Distance
  const formattedDistance = useMemo(() => {
    const km = tripRoute.totalDistanceKm || 0;
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km} km`;
  }, [tripRoute.totalDistanceKm]);

  // Multi-Mode Metrics
  const modeMetrics = useMemo(() => {
    const legsForFare = tripRoute.legs.map((l) => ({ fromName: l.fromName, toName: l.toName, distanceKm: l.distanceKm }));
    const autoFare = computeTripFareSummary(legsForFare, 'auto');
    const cabFare = computeTripFareSummary(legsForFare, 'cab');

    let totalWalkMin = 0;
    let totalAutoMin = 0;
    let totalCabMin = 0;

    tripRoute.legs.forEach((leg) => {
      totalWalkMin += leg.modeEstimates?.walk?.timeMin || Math.round(leg.distanceKm * 12);
      totalAutoMin += leg.modeEstimates?.auto?.timeMin || Math.round(leg.distanceKm * 2.5);
      totalCabMin += leg.modeEstimates?.cab?.timeMin || Math.round(leg.distanceKm * 2);
    });

    const formatMin = (m: number) => {
      const h = Math.floor(m / 60);
      const rem = m % 60;
      return h > 0 ? `${h}h ${rem > 0 ? `${rem}m` : ''}` : `${rem} min`;
    };

    return {
      auto: {
        fare: autoFare.totalFareDisplay,
        timeDisplay: formatMin(totalAutoMin),
      },
      cab: {
        fare: cabFare.totalFareDisplay,
        timeDisplay: formatMin(totalCabMin),
      },
      walk: {
        fare: 'Free (₹0)',
        timeDisplay: formatMin(totalWalkMin),
      },
      bus: {
        fare: 'Fare unavailable',
        timeDisplay: 'Unavailable',
      },
    };
  }, [tripRoute.legs]);

  // Budget Breakdown Calculation
  const budgetSummary = useMemo(() => {
    const legsForFare = tripRoute.legs.map((l) => ({ fromName: l.fromName, toName: l.toName, distanceKm: l.distanceKm }));
    const fareSummary = computeTripFareSummary(legsForFare, activeTransport);

    const travelMin = fareSummary.totalMinFareInr;
    const travelMax = fareSummary.totalMaxFareInr;

    // Entry fees parsing from stops
    let placeFeesMin = 0;
    let placeFeesMax = 0;
    tripPlaces.forEach((p) => {
      if (p.entryFee) {
        const match = p.entryFee.match(/(\d+)/);
        if (match) {
          const val = parseInt(match[1], 10);
          placeFeesMin += val;
          placeFeesMax += val;
        }
      }
    });

    const totalMinFare = travelMin + placeFeesMin;
    const totalMaxFare = travelMax + placeFeesMax;
    const userBudget = preferences.budgetAmount || 2500;

    const remainingMin = Math.max(0, userBudget - totalMaxFare);
    const remainingMax = Math.max(0, userBudget - totalMinFare);

    let travelDisplay = 'Free (₹0)';
    if (activeTransport === 'bus') {
      travelDisplay = 'Fare unlinked';
    } else if (activeTransport !== 'walk') {
      travelDisplay = `₹${travelMin.toLocaleString('en-IN')}–₹${travelMax.toLocaleString('en-IN')}`;
    }

    let estimatedTotalDisplay = 'Free (₹0)';
    if (activeTransport === 'walk') {
      estimatedTotalDisplay = placeFeesMax > 0 ? `₹${placeFeesMin.toLocaleString('en-IN')}–₹${placeFeesMax.toLocaleString('en-IN')}` : 'Free (₹0)';
    } else if (activeTransport === 'bus') {
      estimatedTotalDisplay = placeFeesMax > 0 ? `₹${placeFeesMin.toLocaleString('en-IN')}+` : 'Transit unlinked';
    } else {
      estimatedTotalDisplay = `₹${totalMinFare.toLocaleString('en-IN')}–₹${totalMaxFare.toLocaleString('en-IN')}`;
    }

    return {
      travelDisplay,
      placeFeesDisplay: placeFeesMax > 0 ? `₹${placeFeesMin.toLocaleString('en-IN')}–₹${placeFeesMax.toLocaleString('en-IN')}` : 'Free / Included',
      estimatedTotalDisplay,
      userBudgetDisplay: `₹${userBudget.toLocaleString('en-IN')}`,
      remainingDisplay: `₹${remainingMin.toLocaleString('en-IN')}–₹${remainingMax.toLocaleString('en-IN')}`,
      isOverBudget: totalMinFare > userBudget,
      userBudget,
      totalMinFare,
      totalMaxFare,
    };
  }, [tripRoute.legs, activeTransport, tripPlaces, preferences.budgetAmount]);

  // Trip Confidence Status (Trip looks good vs Trip needs attention)
  const tripConfidence = useMemo(() => {
    const reasons: string[] = [];

    if (weatherImpact?.hasWeatherAlert || weatherImpact?.overallSeverity === 'HIGH' || weatherImpact?.overallSeverity === 'SEVERE') {
      reasons.push(weatherImpact.summary || 'Weather conflict likely during outdoor stops');
    }

    const closedStops = schedule.stops.filter((s) => s.openStatus === 'closed');
    if (closedStops.length > 0) {
      reasons.push(`${closedStops.length} stop(s) may be closed during scheduled visit hours`);
    }

    if (feasibility.status === 'exceeded') {
      reasons.push(`Schedule exceeds planned available time by ${feasibility.exceededMinutes}m`);
    }

    if (budgetSummary.isOverBudget) {
      reasons.push(`Estimated cost exceeds your planned budget of ${budgetSummary.userBudgetDisplay}`);
    }

    if (activeTransport === 'bus') {
      reasons.push('Bus/metro schedules are unlinked for this travel corridor');
    }

    if (activeTransport === 'walk' && tripRoute.totalDistanceKm > 4) {
      reasons.push(`Walking distance is long (${tripRoute.totalDistanceKm} km) — consider Auto or Cab`);
    } else if (tripRoute.totalDistanceKm > 40) {
      reasons.push(`Long travel distance (${tripRoute.totalDistanceKm} km) across stops`);
    }

    const isGood = reasons.length === 0;

    return {
      isGood,
      badgeText: isGood ? 'Trip looks good ✓' : 'Trip needs attention ⚠️',
      reasons,
    };
  }, [weatherImpact, schedule.stops, feasibility, budgetSummary, activeTransport, tripRoute.totalDistanceKm]);

  // Friendly "Why this order?" points
  const friendlyOrderPoints = useMemo(() => {
    const points: string[] = [];

    if (isOptimized || distanceSavedKm > 0) {
      points.push(distanceSavedKm > 0 
        ? `Shorter travel between stops (~${distanceSavedKm} km saved)` 
        : 'Shorter travel between stops with streamlined routing');
    } else {
      points.push('Shorter travel between stops');
    }

    const hasMatchedInterests = tripPlaces.some((p) => p.matchScore && p.matchScore > 40);
    if (hasMatchedInterests) {
      points.push('Matches your interests');
    }

    if (feasibility.status !== 'exceeded') {
      points.push('Fits your available time');
    }

    if (!weatherImpact?.hasWeatherAlert) {
      points.push('Avoids likely rain');
    }

    if (!budgetSummary.isOverBudget) {
      points.push('Keeps the trip within budget');
    }

    return points;
  }, [isOptimized, distanceSavedKm, tripPlaces, feasibility.status, weatherImpact, budgetSummary.isOverBudget]);

  // Active & Recommended mode metadata
  const activeDetails = MODE_CONFIG[activeTransport] || MODE_CONFIG.auto;
  const recommendedDetails = MODE_CONFIG[recommendedMode] || MODE_CONFIG.cab;

  const activeHeadline = useMemo(() => {
    if (!isCustomSelected && tripRecommendation?.recommended?.tagline) {
      return tripRecommendation.recommended.tagline;
    }
    return activeDetails.summaryHeadline;
  }, [isCustomSelected, tripRecommendation, activeDetails]);

  const activeReason = useMemo(() => {
    if (!isCustomSelected && tripRecommendation?.recommended?.matchReasons && tripRecommendation.recommended.matchReasons.length > 0) {
      return tripRecommendation.recommended.matchReasons.join('. ');
    }
    return activeDetails.defaultReason;
  }, [isCustomSelected, tripRecommendation, activeDetails]);

  // Safe Google Maps navigation URL
  const googleMapsUrl = useMemo(() => {
    if (tripPlaces.length === 0) return '';
    const lastPlace = tripPlaces[tripPlaces.length - 1];
    const waypoints = tripPlaces.length > 1 ? tripPlaces.slice(0, -1) : [];
    return `https://www.google.com/maps/dir/?api=1&origin=${tripRoute.origin.lat},${tripRoute.origin.lon}&destination=${lastPlace.lat},${lastPlace.lon}${
      waypoints.length > 0 ? `&waypoints=${waypoints.map((p) => `${p.lat},${p.lon}`).join('|')}` : ''
    }&travelmode=driving`;
  }, [tripPlaces, tripRoute.origin]);

  const toggleManeuversExpand = (idx: number) => {
    setExpandedManeuversLegIndex((prev) => (prev === idx ? null : idx));
  };

  const formatStopNumber = (index: number) => {
    const num = index + 1;
    return num < 10 ? `0${num}` : `${num}`;
  };

  // =========================================================================
  // EMPTY STATE: Rendered when tripPlaces.length === 0
  // =========================================================================
  if (tripPlaces.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn py-6 px-4">
        {/* Top Destination Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-100 text-sky-700 text-xs font-bold mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>Trip Planner</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Trip
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {destinationCity}
          </p>
        </div>

        {/* Empty State Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center shadow-xs space-y-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto shadow-inner border border-sky-100">
            <Navigation className="w-8 h-8 sm:w-10 sm:h-10 text-sky-600" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Your trip is empty.
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Add places from Explore, Food, or Map to start planning your journey.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onExploreMore}
              className="w-full sm:w-auto px-6 py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-sky-600/20 cursor-pointer flex items-center justify-center space-x-2 group"
            >
              <Compass className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span>Explore Places</span>
            </button>

            {onNavigateToFood && (
              <button
                onClick={onNavigateToFood}
                className="w-full sm:w-auto px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center justify-center space-x-2 group"
              >
                <Utensils className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Explore Food</span>
              </button>
            )}

            <button
              onClick={onNavigateToMap}
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-2xs cursor-pointer flex items-center justify-center space-x-2"
            >
              <MapIcon className="w-4 h-4 text-slate-500" />
              <span>Open Map</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ACTIVE TRIP WORKSPACE (Compact, Client-Facing, Data-Trusted)
  // =========================================================================
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fadeIn pb-12 px-2 sm:px-4">
      {/* 1. PRIMARY TRIP SUMMARY (Compact Header) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
        {/* Destination & Action Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 block">
              YOUR DAY JOURNEY
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {destinationCity}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Starting from <strong>{startPointLabel}</strong></span>
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
            <button
              onClick={onNavigateToMap}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>View on Map</span>
            </button>

            <button
              onClick={onExploreMore}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stop</span>
            </button>

            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open turn-by-turn navigation in Google Maps"
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Stops */}
          <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Stops
            </span>
            <div className="mt-1">
              <span className="text-lg sm:text-xl font-black text-sky-700">
                {tripPlaces.length}
              </span>
              <span className="text-xs font-bold text-slate-600 ml-1">places</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              Planned stops
            </span>
          </div>

          {/* Total Distance */}
          <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Distance
            </span>
            <div className="mt-1">
              <span className="text-lg sm:text-xl font-black text-slate-900">
                {formattedDistance}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              Total journey
            </span>
          </div>

          {/* Travel & Visit Time */}
          <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Travel Time
            </span>
            <div className="mt-1">
              <span className="text-lg sm:text-xl font-black text-slate-900">
                {formattedTotalTime}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 flex items-center space-x-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Travel + visits</span>
            </span>
          </div>

          {/* Estimated Total Cost */}
          <div className="p-3 rounded-2xl bg-slate-50/90 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Estimated Total
            </span>
            <div className="mt-1">
              <span className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {budgetSummary.estimatedTotalDisplay}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              estimated
            </span>
          </div>
        </div>
      </div>

      {/* 2. TRIP CONFIDENCE / FEASIBILITY STATUS */}
      <div className={`p-4 rounded-2xl border text-xs transition-all ${
        tripConfidence.isGood
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          : 'bg-amber-50/80 border-amber-200 text-amber-950'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full font-black text-xs ${
              tripConfidence.isGood ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              {tripConfidence.isGood ? (
                <ShieldCheck className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              <span>{tripConfidence.badgeText}</span>
            </span>
            <span className="font-semibold text-slate-700">
              {tripConfidence.isGood
                ? 'All stops fit comfortably into your schedule, weather, and budget.'
                : 'Review a few suggestions to keep your journey smooth:'}
            </span>
          </div>
        </div>

        {!tripConfidence.isGood && tripConfidence.reasons.length > 0 && (
          <ul className="mt-2.5 space-y-1 pl-4 border-t border-amber-200/60 pt-2 text-[11px] text-amber-900 list-disc">
            {tripConfidence.reasons.map((r, i) => (
              <li key={i} className="font-medium">{r}</li>
            ))}
          </ul>
        )}
      </div>

      {/* 3. COMPACT TRIP BUDGET SUMMARY */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-4 sm:p-5 shadow-xs text-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-sky-600" />
            <span className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
              TRIP COST
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Approximate estimates
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Travel</span>
            <span className="text-sm font-black text-slate-900 block mt-0.5">
              {budgetSummary.travelDisplay}
            </span>
            <span className="text-[10px] text-slate-400">via {activeDetails.label}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated total</span>
            <span className="text-sm font-black text-slate-900 block mt-0.5">
              {budgetSummary.estimatedTotalDisplay}
            </span>
            <span className="text-[10px] text-slate-400">travel + activities</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Budget</span>
            <span className="text-sm font-black text-slate-900 block mt-0.5">
              {budgetSummary.userBudgetDisplay}
            </span>
            <span className="text-[10px] text-slate-400">your profile limit</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Remaining</span>
            <span className={`text-sm font-black block mt-0.5 ${budgetSummary.isOverBudget ? 'text-rose-600' : 'text-emerald-700'}`}>
              {budgetSummary.remainingDisplay}
            </span>
            <span className="text-[10px] text-slate-400">available funds</span>
          </div>
        </div>
      </div>

      {/* 4. WEATHER-AWARE TRAVEL INTELLIGENCE */}
      <WeatherTripAlert
        weatherImpact={weatherImpact}
        currentStops={tripPlaces}
        activeTransport={activeTransport}
        onApplyOrderSuggestion={(newOrderIds) => reorderTripStops(newOrderIds)}
        onSwitchTransport={(mode) => setSelectedTransport(mode)}
      />

      {/* 5. TRANSPORT SELECTION & RECOMMENDATION */}
      <div className={`rounded-3xl border p-4 sm:p-5 shadow-xs space-y-4 transition-all ${
        isCustomSelected
          ? 'bg-white border-sky-200/90'
          : 'bg-white border-amber-200/90'
      }`}>
        {/* Active Transport Overview */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3.5">
            <div className={`w-11 h-11 rounded-2xl border text-2xl flex items-center justify-center shrink-0 shadow-2xs ${
              isCustomSelected
                ? 'bg-sky-50 border-sky-200/80 text-sky-700'
                : 'bg-amber-50 border-amber-200/80 text-amber-700'
            }`}>
              {activeDetails.icon}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isCustomSelected
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-amber-100/90 text-amber-800'
                }`}>
                  {isCustomSelected ? 'Your transport' : 'Recommended'}
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {formattedDistance} total
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                {activeDetails.label}
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                {activeHeadline}
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Travel cost:</span>
              <span className="text-sm sm:text-base font-black text-slate-900">
                {budgetSummary.travelDisplay}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold sm:mt-0.5">
              {activeTransport === 'bus'
                ? 'Transit time unavailable'
                : `~${tripRoute.selectedModeTimeDisplay || `${tripRoute.totalTravelTimeMin} min`} transit`}
            </span>
          </div>
        </div>

        {/* Restore Recommended Banner */}
        {isCustomSelected && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs animate-fadeIn">
            <div className="flex items-center space-x-2">
              <span className="text-base shrink-0">{recommendedDetails.icon}</span>
              <div className="text-amber-950 font-medium">
                Recommended: <strong>{recommendedDetails.label}</strong> ({tripRecommendation?.recommended?.tagline || recommendedDetails.summaryHeadline})
              </div>
            </div>
            <button
              type="button"
              onClick={resetToRecommendedTransport}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shrink-0 cursor-pointer shadow-xs text-xs flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <span>Switch to recommended</span>
              <span>↺</span>
            </button>
          </div>
        )}

        {/* Why this transport option is active */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Why this transport:
            </span>
            {tripRecommendation?.recommended?.matchReasons && tripRecommendation.recommended.matchReasons.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTransportDetails(!showTransportDetails)}
                className="text-[11px] font-bold text-sky-700 hover:text-sky-900 cursor-pointer"
              >
                {showTransportDetails ? 'Hide details' : 'Details'}
              </button>
            )}
          </div>
          <p className="text-slate-700 leading-relaxed font-medium">
            {activeReason}
          </p>

          {showTransportDetails && tripRecommendation?.recommended?.matchReasons && (
            <div className="pt-2 mt-2 border-t border-slate-200/60 space-y-1 text-[11px] animate-fadeIn">
              {tripRecommendation.recommended.matchReasons.map((r, i) => (
                <div key={i} className="flex items-start space-x-1.5 text-slate-600">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transport Option Cards */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Choose Transport Mode:
            </span>
            <span className="text-[11px] text-slate-400">
              Click to select active transit
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'auto' as TransportMode, label: 'Auto Rickshaw', icon: '🛺' },
              { id: 'cab' as TransportMode, label: 'Cab (Ola/Uber)', icon: '🚕' },
              { id: 'walk' as TransportMode, label: 'Walking', icon: '🚶' },
              { id: 'bus' as TransportMode, label: 'Bus / Metro', icon: '🚌' },
            ].map((m) => {
              const isActive = activeTransport === m.id;
              const isRec = recommendedMode === m.id;
              const metric = modeMetrics[m.id];

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedTransport(m.id)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                    isActive
                      ? 'bg-sky-50/80 border-sky-500 ring-2 ring-sky-200 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xl">{m.icon}</span>
                    <div className="flex flex-col items-end space-y-0.5">
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center space-x-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5 inline" />
                          <span>Active</span>
                        </span>
                      )}
                      {isRec && !isActive && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 text-[9px] font-black uppercase tracking-wider">
                          Recommended
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-1">
                    <span className={`text-xs block ${isActive ? 'font-black text-sky-950' : 'font-bold text-slate-800'}`}>
                      {m.label}
                    </span>
                    <span className={`text-[11px] block mt-0.5 ${isActive ? 'font-extrabold text-sky-800' : 'font-semibold text-slate-900'}`}>
                      {metric.fare}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      ~{metric.timeDisplay}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 6. ITINERARY TIMELINE (Main Flow) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              Trip Itinerary
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Scheduled sequence from start to return via {activeDetails.label}
            </p>
          </div>

          <div className="flex items-center space-x-3 self-end sm:self-auto">
            {isOptimized ? (
              <button
                type="button"
                onClick={resetToManualOrder}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center space-x-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Revert order</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={optimizeTripRoute}
                disabled={tripPlaces.length <= 1}
                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center space-x-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Optimize My Trip</span>
              </button>
            )}

            <button
              onClick={clearTrip}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer px-2 py-1 rounded-lg hover:bg-rose-50"
            >
              Clear Trip
            </button>
          </div>
        </div>

        {/* START Point */}
        <div className="relative pl-9 sm:pl-11">
          <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs ring-4 ring-sky-100 shadow-2xs">
            <MapPin className="w-3 h-3" />
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md bg-sky-600 text-white text-[10px] font-black">
                  START
                </span>
                <span className="font-bold text-slate-700">
                  {schedule.originDepartureStr}
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 mt-1">
                {startPointLabel}
              </h4>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Departure Point
            </span>
          </div>
        </div>

        {/* Sequence Stops */}
        {tripPlaces.map((place, index) => {
          const leg = tripRoute.legs[index];
          const isFirst = index === 0;
          const isLast = index === tripPlaces.length - 1;
          const stopSched = schedule.stops[index];

          return (
            <React.Fragment key={place.id}>
              {/* Connecting Transit Leg */}
              {leg && (
                <div className="relative pl-9 sm:pl-11 py-1">
                  <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-sky-400 to-sky-300 -translate-x-1/2"></div>

                  <div className="p-2.5 bg-sky-50/60 rounded-xl border border-sky-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 my-1">
                    <div className="flex items-center space-x-2 text-slate-700">
                      <ArrowDown className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="font-extrabold text-slate-900">
                        ↓ {leg.estimatedTravelTimeMin} min by {activeDetails.label}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 font-medium">
                        {formatDistanceKm(leg.distanceKm)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-auto text-[11px]">
                      {activeTransport === 'walk' ? (
                        <span className="font-bold text-emerald-700">
                          Free (₹0)
                        </span>
                      ) : activeTransport === 'bus' ? (
                        <span className="font-bold text-slate-400 italic">
                          Fare unavailable
                        </span>
                      ) : (
                        <span className="font-bold text-slate-700">
                          {leg.modeEstimates[activeTransport]?.fareDisplay || ''} estimated
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Stop Card */}
              <div className="relative pl-9 sm:pl-11">
                {/* 2-Digit Stop Badge */}
                <div className="absolute left-0 top-3 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-xs ring-4 ring-orange-100 shadow-2xs">
                  {formatStopNumber(index)}
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    {place.imageUrl ? (
                      <img
                        src={place.imageUrl}
                        alt={place.name}
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-50 to-amber-100 border border-orange-200/80 flex items-center justify-center text-2xl shrink-0 shadow-2xs select-none">
                        📍
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          {place.categoryLabel || place.category}
                        </span>
                        {stopSched?.openStatus && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            stopSched.openStatus === 'open'
                              ? 'bg-emerald-100 text-emerald-800'
                              : stopSched.openStatus === 'closed'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {stopSched.openStatus === 'open' ? '🟢 Open' : stopSched.openStatus === 'closed' ? '🔴 Closed' : '⚪ Status'}
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-black text-slate-900 leading-snug">
                        {place.name}
                      </h4>

                      {/* Timeline Schedule Pill */}
                      {stopSched && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 pt-0.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-800">
                            {stopSched.arrivalTimeStr} Arrive
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-bold border border-amber-200/60">
                            {stopSched.visitDurationDisplay} visit
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 text-[11px]">
                            {stopSched.departureTimeStr} Depart
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: View Details, Re-order, Remove */}
                  <div className="flex items-center space-x-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => onViewPlaceDetails(place)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      onClick={() => moveStopUp(index)}
                      disabled={isFirst}
                      title="Move up"
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => moveStopDown(index)}
                      disabled={isLast}
                      title="Move down"
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFromTrip(place.id)}
                      title="Remove from trip"
                      className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}

        {/* END Node */}
        <div className="relative pl-9 sm:pl-11 pt-1">
          <div className="absolute left-0 top-2.5 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs ring-4 ring-emerald-100 shadow-2xs">
            🏁
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black">
                  RETURN
                </span>
                <span className="font-bold text-slate-700">
                  ~{schedule.endTimeStr}
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 mt-1">
                Trip Complete
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {tripPlaces.length} places visited
            </span>
          </div>
        </div>
      </div>

      {/* 7. WHY THIS ORDER? (Friendly Checklist) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-base">💡</span>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
              WHY THIS ORDER?
            </h4>
          </div>
          <button
            type="button"
            onClick={() => setShowWhyOrder(!showWhyOrder)}
            className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center space-x-1 cursor-pointer"
          >
            <span>{showWhyOrder ? 'Less details' : 'Learn more'}</span>
            {showWhyOrder ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Friendly Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-slate-700">
          {friendlyOrderPoints.map((point, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                ✓
              </span>
              <span className="font-medium">{point}</span>
            </div>
          ))}
        </div>

        {/* Expanded Narrative */}
        {showWhyOrder && (
          <div className="p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100 text-xs text-slate-700 space-y-2 mt-2 animate-fadeIn">
            <p className="leading-relaxed">
              {itineraryExplanation.overallReason}
            </p>
            {itineraryExplanation.efficiencyReason && (
              <p className="text-emerald-800 font-semibold">
                {itineraryExplanation.efficiencyReason}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 8. AI TRAVEL GUIDE ENTRY POINT (Ask about this trip) */}
      <div className="bg-gradient-to-r from-sky-50 to-indigo-50/60 rounded-3xl border border-sky-100 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900">
                Ask about this trip
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                Get grounded answers about your route, timings, costs, and weather
              </p>
            </div>
          </div>

          {onNavigateToAI && (
            <button
              onClick={() => onNavigateToAI()}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Open AI Guide
            </button>
          )}
        </div>

        {/* Prompt Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {AI_QUICK_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => onNavigateToAI?.(question)}
              className="px-3 py-1.5 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-900 border border-sky-200/80 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer flex items-center space-x-1.5 group"
            >
              <span>{question}</span>
              <span className="text-sky-500 group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
          ))}
        </div>
      </div>

      {/* 9. ADVANCED DETAILS (Hidden by default) */}
      <div className="pt-1 text-center">
        <button
          type="button"
          onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer inline-flex items-center space-x-1"
        >
          <span>{showAdvancedDetails ? 'Hide calculation details' : 'Route & transit calculation details'}</span>
          {showAdvancedDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvancedDetails && (
          <div className="mt-3 p-4 sm:p-5 rounded-3xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-600 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between font-extrabold text-slate-900">
              <span className="flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-sky-600" />
                <span>Route &amp; Fare Calculation Details</span>
              </span>
              <span className="text-[10px] font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                {tripRoute.isRoadNetwork ? 'Road Network Geometry' : 'Direct Distance'}
              </span>
            </div>

            <div className="space-y-1.5 leading-relaxed text-[11px]">
              <div>• <strong>Route Calculation:</strong> {tripRoute.isRoadNetwork ? 'Measured via real road network paths' : 'Measured via direct coordinate distance'}</div>
              <div>• <strong>Active Transit Mode:</strong> {activeTransport.toUpperCase()} ({tripRoute.selectedModeTimeDisplay})</div>
              <div>• <strong>Recommended Transport:</strong> {recommendedMode.toUpperCase()} ({recommendedDetails.label})</div>
              <div>• <strong>Total Multi-Leg Travel Distance:</strong> {tripRoute.totalDistanceKm} km across {tripRoute.legs.length} leg(s)</div>
              <div>• <strong>Schedule Margin:</strong> {feasibility.status === 'exceeded' ? `+${feasibility.exceededMinutes}m Over available window` : `${feasibility.remainingMinutes}m Available`} vs {preferences.availableHours}h limit.</div>
            </div>

            {/* Turn by turn maneuvers if available */}
            {tripRoute.legs.some((l) => l.maneuvers && l.maneuvers.length > 0) && (
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Turn-by-Turn Leg Navigation:
                </span>
                {tripRoute.legs.map((leg, lIdx) => (
                  <div key={lIdx} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleManeuversExpand(lIdx)}
                      className="text-[11px] font-bold text-sky-700 hover:text-sky-900 flex items-center space-x-1"
                    >
                      <span>Leg {lIdx + 1}: {leg.fromName} → {leg.toName} ({leg.maneuvers?.length || 0} steps)</span>
                      {expandedManeuversLegIndex === lIdx ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {expandedManeuversLegIndex === lIdx && leg.maneuvers && (
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 max-h-36 overflow-y-auto space-y-1">
                        {leg.maneuvers.map((m, mIdx) => (
                          <div key={mIdx} className="text-[10px] text-slate-600 flex items-start space-x-1.5">
                            <span className="font-bold text-slate-400">{mIdx + 1}.</span>
                            <span>{m.instruction}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
