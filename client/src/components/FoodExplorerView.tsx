import React from 'react';
import { 
  UtensilsCrossed, 
  MapPin, 
  Star, 
  Clock, 
  Plus, 
  Check, 
  Map, 
  RefreshCw, 
  AlertCircle, 
  Compass, 
  Sparkles, 
  Leaf, 
  ChevronRight
} from 'lucide-react';
import { useFood, FoodFilterType } from '../context/FoodContext';
import { useLocation } from '../context/LocationContext';
import { useTrip } from '../context/TripContext';
import { FoodPlace } from '../types/travel';

interface FoodExplorerViewProps {
  onViewOnMap: (place: FoodPlace) => void;
  onViewDetails?: (place: FoodPlace) => void;
}

export const FoodExplorerView: React.FC<FoodExplorerViewProps> = ({
  onViewOnMap
}) => {
  const { location, setIsLocationModalOpen } = useLocation();
  const { 
    filteredFoodPlaces, 
    radius, 
    setRadius, 
    activeFilter, 
    setActiveFilter, 
    isLoading, 
    error, 
    isLive, 
    sourceLabel, 
    refreshFoodPlaces, 
    expandRadius 
  } = useFood();

  const { tripPlaceIds, toggleTripPlace } = useTrip();

  const radiusOptions = [
    { label: '1 km', value: 1000 },
    { label: '3 km', value: 3000 },
    { label: '5 km', value: 5000 },
    { label: '10 km', value: 10000 },
  ];

  const filterOptions: { id: FoodFilterType; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: '🍽️' },
    { id: 'openNow', label: 'Open Now', icon: '🟢' },
    { id: 'budget', label: 'Budget', icon: '💰' },
    { id: 'restaurant', label: 'Restaurants', icon: '🍴' },
    { id: 'cafe', label: 'Cafes', icon: '☕' },
    { id: 'vegetarian', label: 'Vegetarian', icon: '🌱' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      {/* ============================================================== */}
      {/* 1. HEADER & LOCATION / RADIUS BANNER */}
      {/* ============================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200/80 text-xs font-bold tracking-tight">
              <UtensilsCrossed className="w-3.5 h-3.5 text-orange-500" />
              <span>Culinary Discovery</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Food Explorer
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Find great food near your current location.
            </p>
          </div>

          {/* Location & Refresh Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-sky-600" />
              <span>Near {location.city || 'Location'}</span>
            </button>

            <button
              onClick={refreshFoodPlaces}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh food places"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sub-bar: Search Radius & Data Source Tag */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs">
          {/* Radius selector */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Radius:
            </span>
            <div className="flex items-center gap-1.5">
              {radiusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRadius(opt.value)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    radius === opt.value
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Source transparency badge */}
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              isLive
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{sourceLabel}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. CATEGORY / FEATURE FILTERS */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterOptions.map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 3. ERROR & NO-RESULTS STATES */}
      {/* ============================================================== */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 sm:p-8 text-center space-y-3 animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-rose-900">
              Food places couldn't be loaded right now.
            </h3>
            <p className="text-xs text-rose-700">
              Please check your network connection or try refreshing.
            </p>
          </div>
          <button
            onClick={refreshFoodPlaces}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {!error && !isLoading && filteredFoodPlaces.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Compass className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              No food places found within {(radius / 1000).toFixed(0)} km.
            </h3>
            <p className="text-xs text-slate-500">
              Try expanding your discovery radius or changing category filters to see more restaurants.
            </p>
          </div>
          {radius < 10000 && (
            <button
              onClick={expandRadius}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
            >
              <span>Expand to 10 km</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. RECOMMENDED FOR YOU (FOOD PLACES GRID) */}
      {/* ============================================================== */}
      {!error && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-orange-500" />
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Recommended for You
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {filteredFoodPlaces.length} {filteredFoodPlaces.length === 1 ? 'place' : 'places'} found
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFoodPlaces.map((food) => {
              const isSaved = tripPlaceIds.includes(food.id);

              return (
                <div
                  key={food.id}
                  className="bg-white rounded-3xl border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col group"
                >
                  {/* Food Image Banner */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={food.imageUrl}
                      alt={food.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    {/* Category Pill Over Image */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-slate-800 shadow-2xs">
                        {food.foodCategoryLabel}
                      </span>
                      {food.vegetarian && (
                        <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white shadow-2xs flex items-center gap-1">
                          <Leaf className="w-3 h-3" />
                          <span>Pure Veg</span>
                        </span>
                      )}
                    </div>

                    {/* Open Status Badge */}
                    <div className="absolute top-3 right-3">
                      {food.isOpenNow === true && (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-2xs">
                          Open now
                        </span>
                      )}
                      {food.isOpenNow === false && (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-2xs">
                          Closed
                        </span>
                      )}
                      {food.isOpenNow === undefined && (
                        <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-700/80 text-white backdrop-blur-md">
                          Hours unavailable
                        </span>
                      )}
                    </div>

                    {/* Proximity Pill */}
                    <div className="absolute bottom-3 left-3">
                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-900/80 text-white backdrop-blur-md flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-sky-400" />
                        <span>{food.distanceKm.toFixed(1)} km away</span>
                      </span>
                    </div>
                  </div>

                  {/* Food Place Details */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      {/* Name & Rating */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold text-base text-slate-900 group-hover:text-sky-600 transition-colors leading-snug">
                          {food.name}
                        </h3>
                        {food.rating ? (
                          <div className="flex items-center space-x-1 shrink-0 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>{food.rating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-medium shrink-0">
                            Rating: Not available
                          </span>
                        )}
                      </div>

                      {/* Cuisine & Price Info */}
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                        <span>
                          {food.cuisine ? (
                            <span className="font-semibold text-slate-700">{food.cuisine}</span>
                          ) : (
                            <span className="text-slate-600">Cuisine: Not available</span>
                          )}
                        </span>
                        <span>•</span>
                        <span className={`font-semibold ${
                          food.priceLevel === 'budget' 
                            ? 'text-emerald-700' 
                            : food.priceLevel === 'moderate' 
                            ? 'text-amber-700' 
                            : 'text-slate-600'
                        }`}>
                          {food.priceLevelDisplay}
                        </span>
                      </div>

                      {/* Opening Hours Info */}
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 pt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{food.openingHoursDisplay}</span>
                      </div>

                      {/* Recommendation Reason */}
                      {food.recommendationReason && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700 italic leading-snug">
                          "{food.recommendationReason}"
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: View on Map & Add to Trip */}
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onViewOnMap(food)}
                        className="flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700 hover:text-sky-800 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        <Map className="w-3.5 h-3.5 text-sky-600" />
                        <span>View on Map</span>
                      </button>

                      <button
                        onClick={() => toggleTripPlace(food)}
                        className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                          isSaved
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-orange-500 hover:bg-orange-600 text-white'
                        }`}
                      >
                        {isSaved ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>In My Trip</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add to Trip</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
