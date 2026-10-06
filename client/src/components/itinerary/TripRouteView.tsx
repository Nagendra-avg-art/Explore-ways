import React, { useState } from 'react';
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
  Footprints, 
  Car, 
  Bus,
  Info,
  ExternalLink,
  AlertTriangle,
  Wallet,
  Compass,
  XCircle
} from 'lucide-react';
import { useTrip } from '../../context/TripContext';
import { usePreferences } from '../../context/PreferencesContext';
import { Place, TransportMode } from '../../types/travel';
import { formatDistanceKm } from '../../services/routingService';
import { TransportComparisonCard } from '../transport/TransportComparisonCard';
import { recommendTripTransport } from '../../services/transportRecommendationService';
import {
  calculateItinerarySchedule,
  calculateItineraryFeasibility,
  generateItineraryExplanation,
} from '../../services/itineraryEngineService';

interface TripRouteViewProps {
  onViewPlaceDetails: (place: Place) => void;
  onNavigateToMap: () => void;
  onExploreMore: () => void;
}

export const TripRouteView: React.FC<TripRouteViewProps> = ({
  onViewPlaceDetails,
  onNavigateToMap,
  onExploreMore,
}) => {
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
    preferredMode,
    setPreferredMode,
  } = useTrip();

  const { preferences } = usePreferences();
  const [expandedLegIndex, setExpandedLegIndex] = useState<number | null>(null);
  const [expandedManeuversLegIndex, setExpandedManeuversLegIndex] = useState<number | null>(null);
  const [selectedLegIndexForComparison, setSelectedLegIndexForComparison] = useState<number>(0);
  const [showFareAssumptions, setShowFareAssumptions] = useState<boolean>(false);

  // Phase 9.4: Smart Itinerary Transport Recommendation
  const tripRecommendation = React.useMemo(() => {
    return recommendTripTransport(
      tripRoute.legs.map((l) => ({ distanceKm: l.distanceKm, roadDurationMin: l.estimatedTravelTimeMin })),
      preferences
    );
  }, [tripRoute.legs, preferences]);

  if (tripPlaces.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 max-w-xl mx-auto shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto shadow-inner">
          <Navigation className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-slate-900 text-xl">Your Trip Route is Empty</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
          Add destinations from Recommendations or Explore to automatically calculate distances, travel times, and an optimized itinerary.
        </p>
        <button
          onClick={onExploreMore}
          className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-sky-600/20 cursor-pointer inline-flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Explore Recommended Places</span>
        </button>
      </div>
    );
  }

  // Phase 10: Centralized Smart Itinerary Engine calculations
  const schedule = React.useMemo(() => {
    if (tripRoute.schedule) return tripRoute.schedule;
    return calculateItinerarySchedule(tripPlaces, tripRoute.legs, '09:00', preferences.pace);
  }, [tripRoute.schedule, tripPlaces, tripRoute.legs, preferences.pace]);

  const feasibility = React.useMemo(() => {
    if (tripRoute.feasibility) return tripRoute.feasibility;
    return calculateItineraryFeasibility(schedule, preferences, preferredMode, tripPlaces);
  }, [tripRoute.feasibility, schedule, preferences, preferredMode, tripPlaces]);

  const itineraryExplanation = React.useMemo(() => {
    if (tripRoute.itineraryExplanation) return tripRoute.itineraryExplanation;
    return generateItineraryExplanation(
      tripRoute.origin,
      tripPlaces,
      tripRoute.legs,
      preferences,
      preferredMode,
      feasibility,
      distanceSavedKm
    );
  }, [tripRoute.itineraryExplanation, tripRoute.origin, tripPlaces, tripRoute.legs, preferences, preferredMode, feasibility, distanceSavedKm]);

  // Duration calculations
  const totalMin = feasibility.totalTripMinutes;
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  const formattedTotalTime = hours > 0 ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}` : `${minutes} min`;

  // Google Maps Multi-Stop URL construction
  const lastPlace = tripPlaces[tripPlaces.length - 1];
  const waypoints = tripPlaces.length > 1 ? tripPlaces.slice(0, -1) : [];
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${tripRoute.origin.lat},${tripRoute.origin.lon}&destination=${lastPlace.lat},${lastPlace.lon}${
    waypoints.length > 0 ? `&waypoints=${waypoints.map((p) => `${p.lat},${p.lon}`).join('|')}` : ''
  }&travelmode=driving`;

  const toggleLegExpand = (idx: number) => {
    setExpandedLegIndex((prev) => (prev === idx ? null : idx));
  };

  const toggleManeuversExpand = (idx: number) => {
    setExpandedManeuversLegIndex((prev) => (prev === idx ? null : idx));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Top Banner: Route Metrics & Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-extrabold tracking-wide uppercase">
                Phase 10 Smart Itinerary
              </span>
              {tripRoute.isRoadNetwork ? (
                <span className="px-2 py-0.5 rounded-full bg-sky-600 text-white text-[10px] font-extrabold flex items-center space-x-1 shadow-xs">
                  <span>🛣️</span>
                  <span>Real Road Network (OSRM)</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center space-x-1">
                  <span>📐</span>
                  <span>Direct Distance</span>
                </span>
              )}
              {tripRoute.origin.isActualGps ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  <span>Live GPS Origin</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  Demo Hub Origin
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              Itinerary & Route Plan
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Starting from <strong>{tripRoute.origin.label}</strong> with {tripPlaces.length} destination stops.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Open full multi-stop turn-by-turn navigation in Google Maps"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Google Maps</span>
              <span className="sm:hidden">Nav</span>
            </a>
            <button
              onClick={onNavigateToMap}
              className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <MapIcon className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
            <button
              onClick={onExploreMore}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stop</span>
            </button>
          </div>
        </div>

        {/* 5 Summary Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Tile 1: Total Distance */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Distance</span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-sky-700">{tripRoute.totalDistanceKm}</span>
              <span className="text-xs font-bold text-slate-600">km</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              {tripRoute.isRoadNetwork ? 'OSRM road network' : 'Haversine formula'}
            </span>
          </div>

          {/* Tile 2: Estimated Travel Time */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transit Time</span>
            <div className="mt-1 flex items-baseline space-x-1">
              {preferredMode === 'bus' ? (
                <span className="text-base font-extrabold text-slate-500 italic">Unavailable</span>
              ) : (
                <span className="text-2xl font-black text-slate-800">
                  {tripRoute.selectedModeTimeDisplay || `${tripRoute.totalTravelTimeMin} min`}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              {preferredMode === 'walk'
                ? 'Road route walking pace'
                : preferredMode === 'bus'
                ? 'Route data not available'
                : 'Estimated with traffic variance'}
            </span>
          </div>

          {/* Tile 3: Total Estimated Duration */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Duration</span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-orange-600">{formattedTotalTime}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Travel + visits</span>
          </div>

          {/* Tile 4: Transit Fare Status (Phase 9.3) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transit Fare</span>
            <div className="mt-1 flex items-baseline space-x-1">
              {preferredMode === 'walk' ? (
                <>
                  <span className="text-2xl font-black text-emerald-700">₹0</span>
                  <span className="text-xs font-bold text-emerald-600">Free</span>
                </>
              ) : preferredMode === 'bus' ? (
                <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                  Unavailable
                </span>
              ) : (
                <span className="text-base sm:text-lg font-black text-slate-800">
                  {tripRoute.selectedModeFareDisplay || 'Estimated'}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-1">
              {preferredMode === 'walk'
                ? 'Walking is always free'
                : preferredMode === 'bus'
                ? 'Public transit not connected'
                : `Sum of ${tripRoute.legs.length} route ${tripRoute.legs.length === 1 ? 'leg' : 'legs'}`}
            </span>
          </div>

          {/* Tile 5: Total Stops */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Stops</span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-slate-800">{tripPlaces.length}</span>
              <span className="text-xs font-bold text-slate-600">places</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Curated sights</span>
          </div>
        </div>

        {/* Preferred Travel Mode Selector for Itinerary */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Itinerary Transit Mode:</span>
          </div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'auto', label: 'Auto Rickshaw', icon: '🛺' },
              { id: 'cab', label: 'Cab (Ola/Uber)', icon: '🚕' },
              { id: 'bus', label: 'Bus / Metro', icon: '🚌' },
              { id: 'walk', label: 'Walking Only', icon: '🚶' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setPreferredMode(m.id as TransportMode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                  preferredMode === m.id
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Phase 10: Smart Schedule Feasibility Panel */}
        <div className={`p-5 sm:p-6 rounded-3xl border transition-all ${
          feasibility.status === 'feasible'
            ? 'bg-emerald-50/70 border-emerald-200'
            : feasibility.status === 'tight'
            ? 'bg-amber-50/70 border-amber-200'
            : 'bg-rose-50/70 border-rose-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                feasibility.status === 'feasible'
                  ? 'bg-emerald-600 text-white'
                  : feasibility.status === 'tight'
                  ? 'bg-amber-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}>
                {feasibility.status === 'feasible' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : feasibility.status === 'tight' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    feasibility.status === 'feasible'
                      ? 'bg-emerald-200/80 text-emerald-900'
                      : feasibility.status === 'tight'
                      ? 'bg-amber-200/80 text-amber-900'
                      : 'bg-rose-200/80 text-rose-900'
                  }`}>
                    {feasibility.statusLabel}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    {preferences.availableHours}h Planned Window
                  </span>
                </div>
                <h4 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                  {feasibility.headline}
                </h4>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {feasibility.explanation}
                </p>
              </div>
            </div>
          </div>

          {/* Time budget breakdown row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 mt-4 border-t border-slate-200/60 text-xs">
            <div className="p-2.5 bg-white/80 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Transit Time</span>
              <span className="text-sm font-black text-slate-900">{feasibility.totalTravelMinutes} min</span>
              <span className="text-[10px] text-slate-500 block">via {preferredMode.toUpperCase()}</span>
            </div>
            <div className="p-2.5 bg-white/80 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Sightseeing Visits</span>
              <span className="text-sm font-black text-slate-900">
                {Math.floor(feasibility.totalVisitMinutes / 60) > 0 ? `${Math.floor(feasibility.totalVisitMinutes / 60)}h ` : ''}
                {feasibility.totalVisitMinutes % 60}m
              </span>
              <span className="text-[10px] text-slate-500 block">{tripPlaces.length} stops</span>
            </div>
            <div className="p-2.5 bg-white/80 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Buffer Margin</span>
              <span className="text-sm font-black text-slate-900">{feasibility.bufferMinutes} min</span>
              <span className="text-[10px] text-slate-500 block">{preferences.pace} pace</span>
            </div>
            <div className="p-2.5 bg-white/80 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Total Trip Time</span>
              <span className="text-sm font-black text-slate-900">
                {Math.floor(feasibility.totalTripMinutes / 60)}h {feasibility.totalTripMinutes % 60}m
              </span>
              <span className="text-[10px] text-slate-500 block">Door-to-door</span>
            </div>
            <div className="p-2.5 bg-white/80 rounded-xl border border-slate-200/70 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Schedule Margin</span>
              <span className={`text-sm font-black ${
                feasibility.status === 'feasible'
                  ? 'text-emerald-700'
                  : feasibility.status === 'tight'
                  ? 'text-amber-700'
                  : 'text-rose-700'
              }`}>
                {feasibility.status === 'exceeded'
                  ? `+${feasibility.exceededMinutes}m Over`
                  : `${feasibility.remainingMinutes}m Spare`}
              </span>
              <span className="text-[10px] text-slate-500 block">vs {preferences.availableHours}h</span>
            </div>
          </div>

          {/* Actionable Engine Guidance */}
          {feasibility.suggestions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Itinerary Engine Guidance:
              </span>
              {feasibility.suggestions.map((sug, idx) => (
                <div key={idx} className="flex items-start space-x-1.5 text-slate-700">
                  <span className={`font-bold shrink-0 ${
                    feasibility.status === 'feasible' ? 'text-emerald-600' : feasibility.status === 'tight' ? 'text-amber-600' : 'text-rose-600'
                  }`}>•</span>
                  <span className="leading-snug">{sug}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Route Optimization Card */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isOptimized 
            ? 'bg-emerald-50/70 border-emerald-200' 
            : 'bg-sky-50/70 border-sky-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isOptimized ? 'bg-emerald-600 text-white' : 'bg-sky-600 text-white'
              }`}>
                {isOptimized ? <CheckCircle2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {isOptimized ? 'Route Backtracking Minimized' : 'Smart Route Optimization'}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {isOptimized ? (
                    <>
                      Stops ordered via multi-factor itinerary engine.
                      {distanceSavedKm > 0 && (
                        <strong className="text-emerald-700 ml-1">
                          Saved ~{distanceSavedKm} km of zig-zag backtracking!
                        </strong>
                      )}
                    </>
                  ) : (
                    'Re-order stops to eliminate backtracking while prioritizing top interests and opening schedules.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              {isOptimized ? (
                <button
                  onClick={resetToManualOrder}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Revert to Added Order</span>
                </button>
              ) : (
                <button
                  onClick={optimizeTripRoute}
                  disabled={tripPlaces.length <= 1}
                  className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ Optimize My Trip</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Phase 10: "Why this order?" Itinerary Rationale Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                💡
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Why this order?
                </h4>
                <p className="text-[11px] text-slate-500">
                  Deterministic explanation derived from geographic coordinates, visit times, and your preferences.
                </p>
              </div>
            </div>
            {isOptimized ? (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md">
                Optimized Order Active
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md">
                Custom Added Order
              </span>
            )}
          </div>

          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-2.5 bg-sky-50/60 rounded-xl border border-sky-100 text-slate-800 font-medium">
              📍 <strong>Overall Flow:</strong> {itineraryExplanation.overallReason}
            </div>

            {itineraryExplanation.efficiencyReason && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start space-x-2">
                <span className="text-sky-600 font-bold shrink-0">🛣️</span>
                <span>{itineraryExplanation.efficiencyReason}</span>
              </div>
            )}

            {itineraryExplanation.transportReason && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-start space-x-2">
                <span className="text-amber-600 font-bold shrink-0">🛺</span>
                <span>{itineraryExplanation.transportReason}</span>
              </div>
            )}

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Stop-by-Stop Rationale:
              </span>
              {itineraryExplanation.stopReasons.map((sr) => (
                <div key={sr.placeId} className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {sr.stopIndex + 1}
                  </span>
                  <div className="flex-1">
                    <span className="font-extrabold text-slate-900 mr-1.5">{sr.placeName}:</span>
                    <span className="text-slate-600 leading-relaxed">{sr.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Phase 9.4: Smart Transport Recommendation & Trip Budget Impact Panel */}
      <div className="bg-white rounded-3xl border border-amber-300/80 p-6 sm:p-7 shadow-xs space-y-4 animate-fadeIn bg-gradient-to-br from-amber-500/5 via-sky-500/5 to-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider flex items-center space-x-1 shadow-2xs">
                <Sparkles className="w-3 h-3 fill-white" />
                <span>Smart Transport Recommendation</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white text-slate-700 text-[10px] font-bold border border-slate-200">
                Match Score: {tripRecommendation.recommended.score}/100
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">
              Recommended Mode for Entire Itinerary
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized for your {preferences.availableHours}h schedule, ₹{preferences.budgetAmount.toLocaleString('en-IN')} trip budget, and {preferences.travelStyle} travel style.
            </p>
          </div>

          {preferredMode !== tripRecommendation.recommended.mode ? (
            <button
              type="button"
              onClick={() => setPreferredMode(tripRecommendation.recommended.mode)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-xs transition-all self-start sm:self-auto cursor-pointer flex items-center space-x-1.5"
            >
              <span>Apply {tripRecommendation.recommended.modeLabel} to Route →</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-black flex items-center space-x-1 self-start sm:self-auto">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Recommended Mode Active</span>
            </span>
          )}
        </div>

        {/* Highlight Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/90 border border-amber-200/80 shadow-2xs">
          <div className="flex items-center space-x-3.5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white text-3xl flex items-center justify-center shrink-0 shadow-sm">
              {tripRecommendation.recommended.icon}
            </div>
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <h4 className="text-lg font-black text-slate-900">
                  {tripRecommendation.recommended.modeLabel}
                </h4>
                <span className="text-xs font-extrabold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-md">
                  {tripRecommendation.recommended.tagline}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-600 mt-1 font-semibold">
                <span className="text-slate-900 font-black">{tripRecommendation.recommended.travelTimeDisplay}</span>
                <span>•</span>
                <span className="font-black text-slate-900">{tripRecommendation.recommended.fareEstimate.fareDisplay}</span>
                <span>•</span>
                <span>{tripRoute.totalDistanceKm} km total trip</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trip Budget Impact Breakdown */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-2">
          <div className="flex items-center justify-between font-bold text-slate-800">
            <span className="flex items-center space-x-1.5">
              <Wallet className="w-3.5 h-3.5 text-sky-600" />
              <span>Trip Budget vs Estimated Transport Cost</span>
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">
              Configured Trip Budget: ₹{preferences.budgetAmount.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Configured Trip Budget</span>
              <span className="text-base font-black text-slate-900">₹{preferences.budgetAmount.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Total plan allowance</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Estimated Transport ({tripRecommendation.recommended.modeLabel.split(' ')[0]})</span>
              <span className="text-base font-black text-slate-900">
                {tripRecommendation.recommended.fareEstimate.fareDisplay}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                ~{tripRecommendation.budgetImpact.percentOfBudget}% of trip budget
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Remaining for Sights & Dining</span>
              <span className={`text-base font-black ${
                tripRecommendation.budgetImpact.remainingBudgetMinInr > 0 ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {tripRecommendation.recommended.mode === 'walk'
                  ? `₹${preferences.budgetAmount.toLocaleString('en-IN')}`
                  : `₹${tripRecommendation.budgetImpact.remainingBudgetMinInr.toLocaleString('en-IN')}–₹${tripRecommendation.budgetImpact.remainingBudgetMaxInr.toLocaleString('en-IN')}`}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Buffer for entry tickets & food
              </span>
            </div>
          </div>
        </div>

        {/* Why this mode was recommended */}
        <div className="pt-1 space-y-1.5 text-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
            Why this mode fits your itinerary:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tripRecommendation.recommended.matchReasons.map((reason, idx) => (
              <div key={idx} className="flex items-start space-x-1.5 text-[11px] bg-white/80 p-2.5 rounded-xl border border-slate-100">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span className="leading-snug text-slate-700">{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alternatives Strip */}
        {tripRecommendation.alternatives.length > 0 && (
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Viable Alternatives:
            </span>
            {tripRecommendation.alternatives.map((alt) => (
              <button
                key={alt.mode}
                type="button"
                onClick={() => setPreferredMode(alt.mode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center space-x-1.5 ${
                  preferredMode === alt.mode
                    ? 'bg-sky-600 text-white border-sky-600 shadow-2xs font-extrabold'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>{alt.icon}</span>
                <span>{alt.modeLabel}:</span>
                <span className={preferredMode === alt.mode ? 'text-white' : 'text-slate-600 font-semibold'}>
                  {alt.fareEstimate.fareDisplay}
                </span>
                <span className="text-[10px] opacity-75">
                  ({alt.role === 'budget' ? 'Budget option' : 'Faster alternative'})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Phase 9.3: Dedicated Multi-Stop Trip Fare Estimate Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 block">
                Trip Fare Estimate
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                Per-Leg Calculation
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
              Multi-Stop Cost Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculated individually per route leg, then summed. Not a live booking quote.
            </p>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center space-x-1.5 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0">
            {([
              { id: 'auto' as const, label: 'Auto', icon: '🛺' },
              { id: 'cab' as const, label: 'Cab', icon: '🚕' },
              { id: 'walk' as const, label: 'Walk', icon: '🚶' },
              { id: 'bus' as const, label: 'Bus', icon: '🚌' },
            ]).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPreferredMode(m.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 shrink-0 ${
                  preferredMode === m.id
                    ? 'bg-sky-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{m.icon}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Leg-by-leg Fare Rows */}
        <div className="space-y-2.5">
          {tripRoute.legs.map((leg, lIdx) => {
            const legFare = leg.modeEstimates[preferredMode];
            const modeIcon = preferredMode === 'walk' ? '🚶' : preferredMode === 'auto' ? '🛺' : preferredMode === 'cab' ? '🚕' : '🚌';
            const modeName = preferredMode === 'walk' ? 'Walking' : preferredMode === 'auto' ? 'Auto' : preferredMode === 'cab' ? 'Cab' : 'Bus';

            return (
              <div
                key={lIdx}
                className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-800 font-black text-[11px] flex items-center justify-center shrink-0">
                    L{lIdx + 1}
                  </span>
                  <div>
                    <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
                      <span className="truncate max-w-[120px] sm:max-w-[200px]">{leg.fromName}</span>
                      <span className="text-slate-400">→</span>
                      <span className="truncate max-w-[120px] sm:max-w-[200px]">{leg.toName}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {leg.distanceKm} km {leg.isRoadNetwork ? 'road route' : 'direct'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-semibold block">
                      {modeIcon} {modeName}
                    </span>
                    <span className={`font-black text-xs sm:text-sm ${
                      preferredMode === 'walk' ? 'text-emerald-700' : preferredMode === 'bus' ? 'text-slate-500 italic' : 'text-slate-900'
                    }`}>
                      {preferredMode === 'walk'
                        ? 'Free (₹0)'
                        : preferredMode === 'bus'
                        ? 'Unavailable'
                        : legFare?.fareDisplay || 'Estimated'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Total Summary Footer */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50/60 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 block">
              Estimated Trip Total
            </span>
            <div className="text-xs text-slate-600 mt-0.5">
              {tripRoute.legs.length > 1 ? (
                <span>
                  Sum of {tripRoute.legs.length} route legs ({tripRoute.legs.map((_, i) => `Leg ${i + 1}`).join(' + ')})
                </span>
              ) : (
                <span>Direct single leg route</span>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className={`text-xl font-black ${
              preferredMode === 'walk' ? 'text-emerald-700' : preferredMode === 'bus' ? 'text-slate-500 italic text-base' : 'text-slate-900'
            }`}>
              {preferredMode === 'walk'
                ? 'Free (₹0)'
                : preferredMode === 'bus'
                ? 'Unavailable'
                : tripRoute.selectedModeFareDisplay || 'Estimated'}
            </div>
            <span className="text-[10px] text-slate-500 font-semibold block">
              {preferredMode === 'walk' ? 'Walking is 100% free' : preferredMode === 'bus' ? 'GTFS transit lines not connected' : 'Excludes live surge & tolls'}
            </span>
          </div>
        </div>

        {/* Small How Estimated Toggle */}
        <div className="pt-1 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5 text-[11px]">
            <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>Fares are approximate models, not live Ola/Uber booking quotes.</span>
          </div>
          <button
            type="button"
            onClick={() => setShowFareAssumptions(!showFareAssumptions)}
            className="text-[11px] font-bold text-sky-700 hover:text-sky-900 flex items-center space-x-1 cursor-pointer select-none"
          >
            <span>{showFareAssumptions ? 'Hide assumptions' : 'Fare assumptions'}</span>
            {showFareAssumptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {showFareAssumptions && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5 animate-fadeIn">
            <div className="font-bold text-slate-800">Phase 9.3 Centralized Assumptions:</div>
            <div>• <strong>Auto Rickshaw:</strong> Base ₹35 (first 1.5 km) + ₹16/km (city) with ±15% traffic variance. Calculated leg-by-leg.</div>
            <div>• <strong>Cab (Ola/Uber):</strong> Base ₹75 (first 2 km) + ₹18/km with traffic range. Live surge, waiting time, and highway tolls excluded.</div>
            <div>• <strong>Multi-Stop Aggregation:</strong> Each leg is evaluated separately with its own base fare and distance, then summed.</div>
            <div>• <strong>Walking:</strong> Always Free (₹0). <strong>Bus/Metro:</strong> Marked as unavailable until actual GTFS line feeds are connected.</div>
          </div>
        )}
      </div>

      {/* Phase 9.1: Featured Transport Mode Comparison Card */}
      {(() => {
        const defaultLegIndex = tripRoute.legs.length > 1 ? 1 : 0;
        const activeIdx = Math.min(
          selectedLegIndexForComparison ?? defaultLegIndex,
          Math.max(0, tripRoute.legs.length - 1)
        );
        const compLeg = tripRoute.legs[activeIdx] || tripRoute.legs[0];

        if (!compLeg) return null;

        return (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4 animate-fadeIn">
            {tripRoute.legs.length > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700">
                  Select itinerary leg to inspect:
                </span>
                <select
                  value={activeIdx}
                  onChange={(e) => setSelectedLegIndexForComparison(Number(e.target.value))}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer shadow-2xs focus:ring-2 focus:ring-sky-500 outline-none"
                >
                  {tripRoute.legs.map((leg, lIdx) => (
                    <option key={lIdx} value={lIdx}>
                      Leg {lIdx + 1}: {leg.fromName} → {leg.toName} ({leg.distanceKm} km)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <TransportComparisonCard
              fromName={compLeg.fromName}
              toName={compLeg.toName}
              distanceKm={compLeg.distanceKm}
              isRoadNetwork={compLeg.isRoadNetwork}
              selectedMode={preferredMode}
              onSelectMode={(mode) => setPreferredMode(mode)}
              roadDrivingTimeMin={compLeg.isRoadNetwork ? compLeg.estimatedTravelTimeMin : undefined}
            />
          </div>
        );
      })()}

      {/* Sequential Route Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="font-extrabold text-slate-900 text-lg">Step-by-Step Waypoint Timeline</h3>
          <button
            onClick={clearTrip}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
          >
            Clear All Stops
          </button>
        </div>

        {/* 1. Origin Marker */}
        <div className="relative pl-10 sm:pl-12">
          {/* Timeline Node */}
          <div className="absolute left-0 top-1 w-7 h-7 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs ring-4 ring-sky-100 shadow-sm">
            <MapPin className="w-3.5 h-3.5" />
          </div>

          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md bg-sky-600 text-white text-[10px] font-black tracking-wide">
                  {schedule.originDepartureStr} START
                </span>
                <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">Departure Point</span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 mt-1">{tripRoute.origin.label}</h4>
              <p className="text-xs text-slate-500">
                Coordinates: {tripRoute.origin.lat.toFixed(4)}° N, {tripRoute.origin.lon.toFixed(4)}° E
              </p>
            </div>
            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 self-start sm:self-auto">
              Starting Location
            </span>
          </div>
        </div>

        {/* Leg 0 (Origin -> Stop 1) and Stops */}
        {tripPlaces.map((place, index) => {
          const leg = tripRoute.legs[index];
          const isFirst = index === 0;
          const isLast = index === tripPlaces.length - 1;
          const isExpanded = expandedLegIndex === index;
          const stopSched = schedule.stops[index];
          const prevDeparture = index === 0 ? schedule.originDepartureStr : schedule.stops[index - 1]?.departureTimeStr || '09:00';

          return (
            <React.Fragment key={place.id}>
              {/* Route Leg Connecting Path */}
              {leg && (
                <div className="relative pl-10 sm:pl-12 py-1 my-1">
                  {/* Vertical connecting line */}
                  <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-sky-400 via-sky-300 to-sky-400 -translate-x-1/2"></div>

                  <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3 sm:p-4 my-2 text-xs space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5 text-sky-950">
                        <ArrowDown className="w-4 h-4 text-sky-600 shrink-0" />
                        <span className="px-1.5 py-0.5 bg-sky-200/80 rounded text-[10px] font-black text-sky-900">
                          Depart {prevDeparture}
                        </span>
                        <span className="font-extrabold">Leg {index + 1}:</span>
                        <span className="truncate max-w-[130px] sm:max-w-none">{leg.fromName} → {leg.toName}</span>
                        <span className="font-black text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                          {formatDistanceKm(leg.distanceKm)}
                        </span>
                        {leg.isRoadNetwork && (
                          <span className="text-[9px] font-extrabold text-sky-700 bg-sky-200/60 px-1.5 py-0.5 rounded">
                            🛣️ Road
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold text-slate-700">
                          {leg.estimatedTravelTimeMin}m via {preferredMode.toUpperCase()}
                          {preferredMode === 'walk' ? ' · Free' : preferredMode === 'bus' ? '' : ` · ${leg.modeEstimates[preferredMode]?.fareDisplay || ''}`}
                        </span>
                        {leg.maneuvers && leg.maneuvers.length > 0 && (
                          <button
                            onClick={() => toggleManeuversExpand(index)}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1 underline cursor-pointer"
                          >
                            <Compass className="w-3 h-3" />
                            <span>{expandedManeuversLegIndex === index ? 'Hide Steps' : `Steps (${leg.maneuvers.length})`}</span>
                          </button>
                        )}
                        <button
                          onClick={() => toggleLegExpand(index)}
                          className="text-[11px] font-bold text-sky-600 hover:text-sky-800 underline cursor-pointer"
                        >
                          {isExpanded ? 'Hide Modes' : 'Compare Modes'}
                        </button>
                      </div>
                    </div>

                    {/* Mode Breakdown Strip */}
                    <div className="flex items-center space-x-2 text-[11px] text-slate-600 overflow-x-auto pt-1">
                      <button
                        type="button"
                        onClick={() => setPreferredMode('walk')}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                          preferredMode === 'walk'
                            ? 'bg-emerald-600 text-white font-extrabold shadow-2xs'
                            : 'bg-white hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <Footprints className="w-3.5 h-3.5" />
                        <span>Walk: {leg.modeEstimates.walk.timeMin}m · Free</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreferredMode('auto')}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                          preferredMode === 'auto'
                            ? 'bg-amber-600 text-white font-extrabold shadow-2xs'
                            : 'bg-white hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <span>🛺</span>
                        <span>Auto: {leg.modeEstimates.auto.timeDisplay || `${leg.modeEstimates.auto.timeMin}m`} · {leg.modeEstimates.auto.fareDisplay}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreferredMode('cab')}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                          preferredMode === 'cab'
                            ? 'bg-indigo-600 text-white font-extrabold shadow-2xs'
                            : 'bg-white hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <Car className="w-3.5 h-3.5" />
                        <span>Cab: {leg.modeEstimates.cab.timeDisplay || `${leg.modeEstimates.cab.timeMin}m`} · {leg.modeEstimates.cab.fareDisplay}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreferredMode('bus')}
                        className={`flex items-center space-x-1 px-2.5 py-1 rounded-xl transition-all cursor-pointer ${
                          preferredMode === 'bus'
                            ? 'bg-sky-600 text-white font-extrabold shadow-2xs'
                            : 'bg-white hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <Bus className="w-3.5 h-3.5" />
                        <span>Bus: Unavailable</span>
                      </button>
                    </div>

                    {/* Expanded Transit Comparison Table / Card */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-sky-200/60 animate-fadeIn">
                        <TransportComparisonCard
                          hideHeader
                          fromName={leg.fromName}
                          toName={leg.toName}
                          distanceKm={leg.distanceKm}
                          isRoadNetwork={leg.isRoadNetwork}
                          selectedMode={preferredMode}
                          onSelectMode={(mode) => setPreferredMode(mode)}
                          roadDrivingTimeMin={leg.isRoadNetwork ? leg.estimatedTravelTimeMin : undefined}
                        />
                      </div>
                    )}

                    {/* Collapsible Turn-by-Turn Maneuvers */}
                    {expandedManeuversLegIndex === index && leg.maneuvers && leg.maneuvers.length > 0 && (
                      <div className="pt-2 border-t border-sky-200/60 space-y-2 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center space-x-1">
                            <Compass className="w-3.5 h-3.5 text-sky-600" />
                            <span>Turn-by-Turn Road Directions ({leg.maneuvers.length} steps)</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">via OpenStreetMap</span>
                        </div>
                        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                          {leg.maneuvers.map((m, mIdx) => (
                            <div
                              key={mIdx}
                              className="text-xs flex items-start space-x-2.5 bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs"
                            >
                              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                                {mIdx + 1}
                              </span>
                              <div className="flex-1 flex items-baseline justify-between gap-2">
                                <span className="text-slate-800 font-medium leading-relaxed">{m.instruction}</span>
                                {m.distanceMeters > 0 && (
                                  <span className="text-[10px] font-bold text-slate-500 shrink-0">
                                    {m.distanceMeters >= 1000
                                      ? `${(m.distanceMeters / 1000).toFixed(1)} km`
                                      : `${Math.round(m.distanceMeters)} m`}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stop Node */}
              <div className="relative pl-10 sm:pl-12">
                {/* Timeline Number Badge */}
                <div className="absolute left-0 top-3 w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center font-extrabold text-xs ring-4 ring-orange-100 shadow-sm">
                  {index + 1}
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <img
                      src={place.imageUrl}
                      alt={place.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                    />
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Stop {index + 1}
                        </span>
                        <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          {place.categoryLabel}
                        </span>
                        {place.matchScore && (
                          <span className="text-[11px] font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                            {place.matchScore}% Match
                          </span>
                        )}
                        {/* Opening Hours Badge (Data Honesty) */}
                        {stopSched && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            stopSched.openStatus === 'open'
                              ? 'bg-emerald-100 text-emerald-800'
                              : stopSched.openStatus === 'closed'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`} title={stopSched.openStatusDetail || stopSched.openStatusLabel}>
                            {stopSched.openStatus === 'open' ? '🟢 ' : stopSched.openStatus === 'closed' ? '🔴 ' : '⚪ '}
                            {stopSched.openStatusLabel}
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                        {place.name}
                      </h4>

                      {/* Schedule Clock Pill: Arrival -> Visit -> Departure */}
                      {stopSched && (
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-semibold text-slate-700 pt-0.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-800">
                            🕒 Arrive: {stopSched.arrivalTimeStr}
                          </span>
                          <span>→</span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-bold border border-amber-200/60" title={stopSched.durationSourceLabel}>
                            ⏳ Visit: {stopSched.visitDurationDisplay}
                            {stopSched.isFallbackEstimate && (
                              <span className="text-[9px] font-normal text-amber-700 ml-1">(est.)</span>
                            )}
                          </span>
                          <span>→</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-800">
                            🛫 Depart: {stopSched.departureTimeStr}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center space-x-3 text-xs text-slate-500">
                        <span>
                          {place.rating !== undefined 
                            ? `⭐ ${place.rating} ${place.reviewCount ? `(${place.reviewCount.toLocaleString()})` : ''}` 
                            : '⭐ Unrated'}
                        </span>
                        <span>•</span>
                        <span className="text-[11px] text-slate-400">
                          {stopSched?.durationSourceLabel || 'Visit estimate'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ordering & Remove Controls */}
                  <div className="flex items-center space-x-1.5 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => onViewPlaceDetails(place)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      Details
                    </button>

                    <button
                      onClick={() => moveStopUp(index)}
                      disabled={isFirst}
                      title="Move earlier in route"
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => moveStopDown(index)}
                      disabled={isLast}
                      title="Move later in route"
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    <button
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

        {/* Phase 10: Trip Complete Summary Node */}
        {tripPlaces.length > 0 && (
          <div className="relative pl-10 sm:pl-12 pt-2">
            <div className="absolute left-0 top-3 w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs ring-4 ring-emerald-100 shadow-sm">
              🏁
            </div>
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-extrabold text-slate-900 block">
                  Trip Completed at ~{schedule.endTimeStr}
                </span>
                <span className="text-slate-500 text-[11px]">
                  Total estimated door-to-door duration: {formattedTotalTime} (including {schedule.bufferMin}m buffer)
                </span>
              </div>
              <span className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] self-start sm:self-auto ${
                feasibility.status === 'feasible'
                  ? 'bg-emerald-100 text-emerald-900'
                  : feasibility.status === 'tight'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-rose-100 text-rose-900'
              }`}>
                {feasibility.statusLabel}
              </span>
            </div>
          </div>
        )}

        {/* Clear Notice / Legend */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {tripRoute.isRoadNetwork
                ? 'Real street route geometry and road distances provided by Open Source Routing Machine (OSRM) + OpenStreetMap.'
                : 'Distances calculated from GPS coordinates via Haversine great-circle formula. Transit fares & travel times are urban traffic model estimates.'}
            </span>
          </div>
          <span className="font-semibold text-slate-500 shrink-0">
            {tripPlaces.length} destination stops planned
          </span>
        </div>
      </div>
    </div>
  );
};
