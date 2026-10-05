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
  Wallet
} from 'lucide-react';
import { useTrip } from '../context/TripContext';
import { usePreferences } from '../context/PreferencesContext';
import { Place, TransportMode } from '../types/travel';
import { formatDistanceKm } from '../services/routingService';

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

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Top Banner: Route Metrics & Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-extrabold tracking-wide uppercase">
                Phase 8 Multi-Stop Itinerary
              </span>
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
            <span className="text-[10px] text-slate-400 mt-1">Haversine formula</span>
          </div>

          {/* Tile 2: Estimated Travel Time */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transit Time</span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-slate-800">{tripRoute.totalTravelTimeMin}</span>
              <span className="text-xs font-bold text-slate-600">min</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">{preferredMode.toUpperCase()} speed model</span>
          </div>

          {/* Tile 3: Total Estimated Duration */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Duration</span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-orange-600">{formattedTotalTime}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Travel + visits</span>
          </div>

          {/* Tile 4: Estimated Transport Cost */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transit Cost</span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-emerald-700">₹{tripRoute.totalEstimatedTransportCostInr}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Estimated fare</span>
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
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold text-slate-600">
                          {leg.estimatedTravelTimeMin}m via {preferredMode.toUpperCase()}
                        </span>
                        <button
                          onClick={() => toggleLegExpand(index)}
                          className="text-[11px] font-bold text-sky-600 hover:text-sky-800 underline cursor-pointer"
                        >
                          {isExpanded ? 'Hide Modes' : 'Compare Modes'}
                        </button>
                      </div>
                    </div>

                    {/* Mode Breakdown Strip */}
                    <div className="flex items-center space-x-3 text-[11px] text-slate-600 overflow-x-auto pt-1">
                      <span className={`flex items-center space-x-1 px-2 py-1 rounded-lg ${preferredMode === 'walk' ? 'bg-white font-bold text-emerald-800 shadow-2xs' : ''}`}>
                        <Footprints className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Walk: {leg.modeEstimates.walk.timeMin}m (₹0)</span>
                      </span>
                      <span className={`flex items-center space-x-1 px-2 py-1 rounded-lg ${preferredMode === 'auto' ? 'bg-white font-bold text-amber-900 shadow-2xs' : ''}`}>
                        <span>🛺</span>
                        <span>Auto: {leg.modeEstimates.auto.timeMin}m ({leg.modeEstimates.auto.costRange})</span>
                      </span>
                      <span className={`flex items-center space-x-1 px-2 py-1 rounded-lg ${preferredMode === 'cab' ? 'bg-white font-bold text-indigo-900 shadow-2xs' : ''}`}>
                        <Car className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Cab: {leg.modeEstimates.cab.timeMin}m ({leg.modeEstimates.cab.costRange})</span>
                      </span>
                      <span className={`flex items-center space-x-1 px-2 py-1 rounded-lg ${preferredMode === 'bus' ? 'bg-white font-bold text-sky-900 shadow-2xs' : ''}`}>
                        <Bus className="w-3.5 h-3.5 text-sky-600" />
                        <span>Bus: {leg.modeEstimates.bus.timeMin}m ({leg.modeEstimates.bus.costRange})</span>
                      </span>
                    </div>

                    {/* Expanded Transit Comparison Table */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-sky-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-fadeIn">
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">🚶 Walking</span>
                          <span className="font-extrabold text-slate-800 text-xs block">{leg.modeEstimates.walk.timeMin} min</span>
                          <span className="text-[11px] font-bold text-emerald-600">₹0 Free</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">🛺 Auto Rickshaw</span>
                          <span className="font-extrabold text-slate-800 text-xs block">{leg.modeEstimates.auto.timeMin} min</span>
                          <span className="text-[11px] font-bold text-amber-700">{leg.modeEstimates.auto.costRange}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">🚕 Cab / Taxi</span>
                          <span className="font-extrabold text-slate-800 text-xs block">{leg.modeEstimates.cab.timeMin} min</span>
                          <span className="text-[11px] font-bold text-indigo-700">{leg.modeEstimates.cab.costRange}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">🚌 Bus / Metro</span>
                          <span className="font-extrabold text-slate-800 text-xs block">{leg.modeEstimates.bus.timeMin} min</span>
                          <span className="text-[11px] font-bold text-sky-700">{leg.modeEstimates.bus.costRange}</span>
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
                        <span>⭐ {place.rating} ({place.reviewCount.toLocaleString()})</span>
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
            <span>Distances calculated from GPS coordinates via Haversine great-circle formula. Transit fares & travel times are urban traffic model estimates.</span>
          </div>
          <span className="font-semibold text-slate-500 shrink-0">
            {tripPlaces.length} destination stops planned
          </span>
        </div>
      </div>
    </div>
  );
};
