import React, { useState, useMemo } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  Compass, 
  RotateCcw, 
  Star, 
  MapPin, 
  Clock,
  Sparkles
} from 'lucide-react';
import { CategoryPills } from '../common/CategoryPills';
import { PlaceCard } from './PlaceCard';
import { WeatherCard } from '../weather/WeatherCard';
import { CategoryId, Place, SortOption } from '../../types/travel';
import { useLocation } from '../../context/LocationContext';
import { usePreferences } from '../../context/PreferencesContext';
import { usePlaces } from '../../context/PlacesContext';
import { useWeather } from '../../context/WeatherContext';
import { scorePlace } from '../../services/recommendationEngine';

interface ExploreViewProps {
  onViewDetails: (place: Place) => void;
  savedPlaceIds: string[];
  onToggleSave: (placeId: string) => void;
}

type DistanceFilter = 'all' | '5' | '10' | '20';
type RatingFilter = 'all' | '4.5' | '4.7';


export const ExploreView: React.FC<ExploreViewProps> = ({
  onViewDetails,
  savedPlaceIds,
  onToggleSave,
}) => {
  const { location, setIsLocationModalOpen } = useLocation();
  const { preferences, updatePreferences, setIsPreferencesModalOpen } = usePreferences();
  const { places: availablePlaces, isLiveDiscovery } = usePlaces();
  const { weather } = useWeather();

  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(true);

  // Derived filter state directly from preferences
  const distanceFilter: DistanceFilter = 
    preferences.maxDistanceKm === 5 ? '5' :
    preferences.maxDistanceKm === 10 ? '10' :
    preferences.maxDistanceKm === 20 ? '20' : 'all';

  const ratingFilter: RatingFilter = 
    preferences.minRating === 4.7 ? '4.7' :
    preferences.minRating === 4.5 ? '4.5' : 'all';

  const openNowOnly = preferences.openNowOnly ?? false;

  // Compute active filters count
  const activeFiltersCount = 
    (distanceFilter !== 'all' ? 1 : 0) + 
    (ratingFilter !== 'all' ? 1 : 0) + 
    (openNowOnly ? 1 : 0) +
    (selectedCategory !== 'all' ? 1 : 0);

  // Filter and Sort places dynamically with AI Recommendation Scoring
  const processedPlaces = useMemo(() => {
    // 1. Score, filter and rank all candidate places using multi-factor engine
    let result = availablePlaces.map((place) => {
      const scored = scorePlace(place, location.lat, location.lon, preferences, weather);
      return {
        ...place,
        distanceKm: scored.distanceKm,
        travelTimeMin: Math.max(5, Math.round(scored.distanceKm * 2.5 + 4)),
        isOpenNow: scored.isOpenNow,
        matchScore: scored.matchScore,
        matchReasons: scored.matchReasons,
        scoreBreakdown: scored.scoreBreakdown,
      };
    });

    // 2. Filter: Category
    if (selectedCategory !== 'all') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // 3. Filter: Search Keyword
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    // 4. Filter: Max Distance Radius
    if (distanceFilter !== 'all') {
      const maxKm = parseFloat(distanceFilter);
      result = result.filter((p) => p.distanceKm <= maxKm);
    }

    // 5. Filter: Minimum Rating
    if (ratingFilter !== 'all') {
      const minStars = parseFloat(ratingFilter);
      result = result.filter((p) => p.rating !== undefined && p.rating >= minStars);
    }

    // 6. Filter: Open Now Status
    if (openNowOnly) {
      result = result.filter((p) => p.isOpenNow === true);
    }

    // 7. Sorting: AI Recommended (Match %), Distance, or Rating
    if (sortBy === 'recommended') {
      result = [...result].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    } else if (sortBy === 'distance') {
      result = [...result].sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === 'rating') {
      result = [...result].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return result;
  }, [selectedCategory, searchQuery, distanceFilter, ratingFilter, openNowOnly, sortBy, location, preferences, weather]);

  const setDistanceFilter = (val: DistanceFilter) => {
    updatePreferences({ maxDistanceKm: val === 'all' ? null : parseFloat(val) });
  };

  const setRatingFilter = (val: RatingFilter) => {
    updatePreferences({ minRating: val === 'all' ? null : parseFloat(val) });
  };

  const setOpenNowOnly = (toggle: boolean | ((prev: boolean) => boolean)) => {
    const nextVal = typeof toggle === 'function' ? toggle(openNowOnly) : toggle;
    updatePreferences({ openNowOnly: nextVal });
  };

  const resetAllFilters = () => {
    setSelectedCategory('all');
    setSearchQuery('');
    setSortBy('recommended');
    updatePreferences({
      maxDistanceKm: null,
      minRating: null,
      openNowOnly: false,
    });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
              Multi-Criteria Search Engine
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Explore Local Destinations
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Distances calculated relative to <strong>{location.formatted}</strong>.
            </p>
          </div>

          <button
            onClick={() => setShowFiltersPanel((prev) => !prev)}
            className="self-start sm:self-center inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
            <span>{showFiltersPanel ? 'Hide Filters' : 'Show Filters'}</span>
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-sky-600 text-white font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* WEATHER SUMMARY (Phase 13) */}
        <div id="explore-weather-summary" className="animate-fadeIn">
          <WeatherCard />
        </div>

        {/* Search Bar & Sort Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 flex items-center shadow-2xs rounded-2xl bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all p-1">
            <div className="pl-3 text-slate-400">
              <Search className="w-4 h-4 text-sky-600" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by keyword, monument, dish, or neighborhood..."
              className="w-full px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mr-2 text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Travel Profile Quick Tune Pill */}
          <button
            type="button"
            onClick={() => setIsPreferencesModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
            title="Click to customize your travel profile and preferences"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span className="capitalize">{preferences.travelStyle}</span>
            <span className="text-amber-400">•</span>
            <span>{preferences.availableHours}h</span>
            <span className="text-[10px] text-amber-600 font-semibold underline">(Edit)</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center space-x-1.5 px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort destinations"
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="recommended">Best Match</option>
              <option value="distance">Distance (Nearest)</option>
              <option value="rating">Rating (Highest)</option>
            </select>
          </div>
        </div>

        {/* Multi-Criteria Filter Controls Panel */}
        {showFiltersPanel && (
          <div className="pt-5 border-t border-slate-100 space-y-4 animate-fadeIn">
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Filter 1: Distance Radius */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  <span>Max Distance Radius</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'Any' },
                    { id: '5', label: '< 5 km' },
                    { id: '10', label: '< 10 km' },
                    { id: '20', label: '< 20 km' },
                  ].map((dist) => (
                    <button
                      key={dist.id}
                      onClick={() => setDistanceFilter(dist.id as DistanceFilter)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        distanceFilter === dist.id
                          ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {dist.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter 2: Star Rating */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span>Minimum Rating</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'All' },
                    { id: '4.5', label: '★ 4.5+' },
                    { id: '4.7', label: '★ 4.7+' },
                  ].map((rate) => (
                    <button
                      key={rate.id}
                      onClick={() => setRatingFilter(rate.id as RatingFilter)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        ratingFilter === rate.id
                          ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {rate.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter 3: Open Now Toggle */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Operating Status</span>
                </label>
                <div>
                  <button
                    onClick={() => setOpenNowOnly((prev) => !prev)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center space-x-2 cursor-pointer ${
                      openNowOnly
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${openNowOnly ? 'bg-white' : 'bg-emerald-500'}`} />
                    <span>{openNowOnly ? 'Open Now Only (Active)' : 'Open Now Only'}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Active Filters Summary & Reset */}
            {activeFiltersCount > 0 && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
                </span>
                <button
                  onClick={resetAllFilters}
                  className="flex items-center space-x-1.5 text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            )}

          </div>
        )}
      </div>

      {/* Category Filter Pills */}
      <CategoryPills
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Results Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">
            Showing <strong>{processedPlaces.length}</strong> of {availablePlaces.length} places
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isLiveDiscovery ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {isLiveDiscovery ? '🟢 Live Nearby' : '🔶 Curated Highlights'}
          </span>
        </div>
        {sortBy !== 'recommended' && (
          <span className="text-xs text-sky-700 font-semibold bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
            Sorted by {sortBy === 'distance' ? 'Distance (Nearest First)' : 'Rating (Highest First)'}
          </span>
        )}
      </div>

      {/* Places Grid */}
      {processedPlaces.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {processedPlaces.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              isSaved={savedPlaceIds.includes(place.id)}
              onToggleSave={onToggleSave}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No destinations found nearby</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            We couldn't find any places matching your current filters or selected location. You can adjust your search criteria or switch to another city.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={resetAllFilters}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm"
            >
              Reset Filters
            </button>
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Change Location
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
