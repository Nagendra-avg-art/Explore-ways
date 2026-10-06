import React, { useState } from 'react';
import { 
  Navigation, 
  Sparkles, 
  MapPin, 
  ArrowDown, 
  Clock, 
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
  Compass
} from 'lucide-react';
import { useTrip } from '../context/TripContext';
import { usePreferences } from '../context/PreferencesContext';
import { Place, TransportMode } from '../types/travel';
import { formatDistanceKm } from '../services/routingService';
import { TransportComparisonCard } from './TransportComparisonCard';

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

  // Duration calculations
  const totalMin = tripRoute.totalEstimatedDurationMin;
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  const formattedTotalTime = hours > 0 ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}` : `${minutes} min`;

  // Time Feasibility Check vs User Available Hours
  const availableMinutes = preferences.availableHours * 60;
  const isOverTime = totalMin > availableMinutes;
  const timeDifferenceMin = Math.abs(totalMin - availableMinutes);

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
                Phase 8 Multi-Stop Itinerary
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

        {/* Time Feasibility Comparison Alert */}
        {isOverTime ? (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-amber-900 block text-sm">Schedule Exceeded ({timeDifferenceMin} min over)</span>
              <p className="mt-0.5 leading-relaxed text-amber-800">
                This {tripPlaces.length}-stop itinerary takes ~<strong>{formattedTotalTime}</strong> ({tripRoute.totalTravelTimeMin}m transit + {tripRoute.totalVisitTimeMin}m sightseeing), which exceeds your planned <strong>{preferences.availableHours}h schedule</strong>. Consider using the route optimizer or removing a destination.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold text-emerald-900 block text-sm">Schedule Feasible ({timeDifferenceMin} min buffer)</span>
              <p className="mt-0.5 leading-relaxed text-emerald-800">
                This itinerary comfortably fits your <strong>{preferences.availableHours}h schedule</strong> with <strong>{timeDifferenceMin} min</strong> of free buffer time for Irani chai, photography, and local meals.
              </p>
            </div>
          </div>
        )}

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
                      Stops ordered via nearest-neighbor algorithm. 
                      {distanceSavedKm > 0 && (
                        <strong className="text-emerald-700 ml-1">
                          Saved ~{distanceSavedKm} km of zig-zag travel!
                        </strong>
                      )}
                    </>
                  ) : (
                    'Re-order stops using the nearest-neighbor algorithm to eliminate backtracking between sights.'
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
                  <span>⚡ Optimize Route Order</span>
                </button>
              )}
            </div>
          </div>
        </div>
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
              <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">Departure Point</span>
              <h4 className="text-sm font-extrabold text-slate-900">{tripRoute.origin.label}</h4>
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

          return (
            <React.Fragment key={place.id}>
              {/* Route Leg Connecting Path */}
              {leg && (
                <div className="relative pl-10 sm:pl-12 py-1 my-1">
                  {/* Vertical connecting line */}
                  <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-sky-400 via-sky-300 to-sky-400 -translate-x-1/2"></div>

                  <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3 sm:p-4 my-2 text-xs space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 text-sky-950">
                        <ArrowDown className="w-4 h-4 text-sky-600 shrink-0" />
                        <span className="font-extrabold">Leg {index + 1}:</span>
                        <span>{leg.fromName} → {leg.toName}</span>
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
                        <span className="text-[11px] font-bold text-slate-600">
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
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
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
                      </div>
                      <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                        {place.name}
                      </h4>
                      <div className="flex items-center space-x-3 text-xs text-slate-500">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Visit: <strong>{place.visitDuration}</strong></span>
                        </span>
                        <span>•</span>
                        <span>
                          {place.rating !== undefined 
                            ? `⭐ ${place.rating} ${place.reviewCount ? `(${place.reviewCount.toLocaleString()})` : ''}` 
                            : '⭐ Unrated'}
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
