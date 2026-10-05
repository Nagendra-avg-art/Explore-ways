import React from 'react';
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
  Info
} from 'lucide-react';
import { useTrip } from '../context/TripContext';
import { Place } from '../types/travel';
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
  } = useTrip();

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

  const hours = Math.floor(tripRoute.totalEstimatedDurationMin / 60);
  const minutes = tripRoute.totalEstimatedDurationMin % 60;
  const formattedTotalTime = hours > 0 ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}` : `${minutes} min`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn">
      {/* Top Banner: Route Metrics & Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-extrabold tracking-wide uppercase">
                Phase 8.1 Distance & Routing
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
              Multi-Stop Route Itinerary
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Starting from <strong>{tripRoute.origin.label}</strong> with {tripPlaces.length} destination stops.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <button
              onClick={onNavigateToMap}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <MapIcon className="w-4 h-4" />
              <span>View Route on Map</span>
            </button>
            <button
              onClick={onExploreMore}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Stop</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Distance</span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-sky-700">{tripRoute.totalDistanceKm}</span>
              <span className="text-xs font-bold text-slate-600">km</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Haversine GPS formula</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estimated Travel</span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-slate-800">{tripRoute.totalTravelTimeMin}</span>
              <span className="text-xs font-bold text-slate-600">min</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Transit speed model</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Duration</span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-orange-600">{formattedTotalTime}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Travel + sight visits</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Stops</span>
            <div className="mt-1 flex items-baseline space-x-1">
              <span className="text-2xl font-black text-slate-800">{tripPlaces.length}</span>
              <span className="text-xs font-bold text-slate-600">places</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1">Sequential itinerary</span>
          </div>
        </div>

        {/* Route Optimization Card */}
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
          isOptimized 
            ? 'bg-emerald-50/70 border-emerald-200' 
            : 'bg-amber-50/70 border-amber-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isOptimized ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
              }`}>
                {isOptimized ? <CheckCircle2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {isOptimized ? 'Route Backtracking Minimized' : 'Smart Route Optimization Available'}
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  {isOptimized ? (
                    <>
                      Stops ordered via nearest-neighbor algorithm. 
                      {distanceSavedKm > 0 && (
                        <strong className="text-emerald-700 ml-1">
                          Saved ~{distanceSavedKm} km of unnecessary zig-zag travel!
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
          <h3 className="font-extrabold text-slate-900 text-lg">Step-by-Step Waypoint Order</h3>
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
              <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">Start Origin</span>
              <h4 className="text-sm font-extrabold text-slate-900">{tripRoute.origin.label}</h4>
              <p className="text-xs text-slate-500">
                Coordinates: {tripRoute.origin.lat.toFixed(4)}° N, {tripRoute.origin.lon.toFixed(4)}° E
              </p>
            </div>
            <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 self-start sm:self-auto">
              Departure Point
            </span>
          </div>
        </div>

        {/* Leg 0 (Origin -> Stop 1) and Stops */}
        {tripPlaces.map((place, index) => {
          const leg = tripRoute.legs[index];
          const isFirst = index === 0;
          const isLast = index === tripPlaces.length - 1;

          return (
            <React.Fragment key={place.id}>
              {/* Route Leg Connecting Path */}
              {leg && (
                <div className="relative pl-10 sm:pl-12 py-1 my-1">
                  {/* Vertical connecting line */}
                  <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-sky-400 via-sky-300 to-sky-400 -translate-x-1/2"></div>

                  <div className="bg-sky-50/60 border border-sky-100 rounded-xl p-3 my-2 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 text-sky-900">
                      <ArrowDown className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="font-bold">Leg {index + 1}:</span>
                      <span>{leg.fromName} → {leg.toName}</span>
                      <span className="font-extrabold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                        {formatDistanceKm(leg.distanceKm)}
                      </span>
                    </div>

                    {/* Mode Estimates */}
                    <div className="flex items-center space-x-3 text-[11px] text-slate-600 overflow-x-auto">
                      <span className="flex items-center space-x-1 shrink-0" title="Walking estimate">
                        <Footprints className="w-3 h-3 text-slate-400" />
                        <span>{leg.modeEstimates.walk.timeMin}m</span>
                      </span>
                      <span className="flex items-center space-x-1 shrink-0 font-medium text-amber-700" title="Auto Rickshaw estimate">
                        <span className="text-xs">🛺</span>
                        <span>{leg.modeEstimates.auto.timeMin}m (₹{leg.modeEstimates.auto.costInr})</span>
                      </span>
                      <span className="flex items-center space-x-1 shrink-0 font-medium text-slate-700" title="Cab estimate">
                        <Car className="w-3 h-3 text-slate-400" />
                        <span>{leg.modeEstimates.cab.timeMin}m (₹{leg.modeEstimates.cab.costInr})</span>
                      </span>
                      <span className="flex items-center space-x-1 shrink-0 text-slate-500" title="Bus/Metro estimate">
                        <Bus className="w-3 h-3 text-slate-400" />
                        <span>{leg.modeEstimates.bus.timeMin}m (₹{leg.modeEstimates.bus.costInr})</span>
                      </span>
                    </div>
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
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
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
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Distances computed from verified coordinates using Haversine great-circle formula. Transit fares & times are algorithmic city estimates.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
