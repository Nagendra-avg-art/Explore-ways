import { useState, useEffect, useMemo } from 'react';
import { MainLayout, NavTab } from './layouts/MainLayout';
import { 
  CategoryPills,
  PlaceCard,
  PlanDayWidget,
  PlaceDetailsModal,
  LocationModal,
  PreferencesModal,
  ExploreView,
  MapView,
  TripRouteView,
  AIGuideView,
  FoodExplorerView,
  WeatherCard
} from './components';
import { WeatherProvider, useWeather } from './context/WeatherContext';
import { FoodProvider } from './context/FoodContext';
import { LocationProvider, useLocation } from './context/LocationContext';
import { PlacesProvider, usePlaces } from './context/PlacesContext';
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { TripProvider, useTrip } from './context/TripContext';
import { CategoryId, Place } from './types/travel';
import { scorePlace } from './services/recommendationEngine';
import { getApiUrl } from './services/apiConfig';
import { 
  MapPin, 
  Route, 
  Sparkles, 
  Search, 
  Info, 
  Compass, 
  Calendar, 
  Loader2,
  AlertCircle,
  SlidersHorizontal,
  Radio,
  RefreshCw
} from 'lucide-react';

interface BackendHealth {
  status: string;
  message: string;
  version: string;
  demoMode: boolean;
  timestamp: string;
}

function MainAppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Location Context
  const { 
    location, 
    status: locationStatus, 
    detectLocation, 
    setDestination,
    setIsLocationModalOpen 
  } = useLocation();

  // Preferences Context
  const { preferences, setIsPreferencesModalOpen } = usePreferences();

  // Weather Context (Phase 13)
  const { weather } = useWeather();

  // Trip Context
  const { 
    tripPlaces, 
    tripPlaceIds, 
    toggleTripPlace, 
    tripRoute 
  } = useTrip();

  // Real Location & Nearby Place Discovery Context
  const {
    places: discoveredPlaces,
    isLiveDiscovery,
    isLoading: isLoadingNearby,
    totalFound,
    discoverNearbyPlaces,
    useDemoFallback,
    knownPlacesMap,
    registerPlace
  } = usePlaces();

  // Active candidate places (Live OSM or Location-Safe Demo Seed, including any viewed food POIs)
  // Active candidate places strictly for the current destination
  const availablePlaces = useMemo(() => {
    return discoveredPlaces;
  }, [discoveredPlaces]);

  // Discovery state
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [destinationSuggestions, setDestinationSuggestions] = useState<import('./types/travel').GeoLocation[]>([]);
  const [isSearchingDestinations, setIsSearchingDestinations] = useState<boolean>(false);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState<boolean>(false);
  const savedPlaceIds = tripPlaceIds;
  
  // Destination search debounce
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setDestinationSuggestions([]);
      setShowSuggestionsDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingDestinations(true);
      try {
        const res = await fetch(getApiUrl(`/api/location/search?q=${encodeURIComponent(q)}`));
        if (res.ok) {
          const data = await res.json();
          const results = data.results || [];
          setDestinationSuggestions(results);
          setShowSuggestionsDropdown(results.length > 0);
        }
      } catch (err) {
        console.warn('Hero destination search error:', err);
      } finally {
        setIsSearchingDestinations(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectDestination = (dest: import('./types/travel').GeoLocation) => {
    setDestination(dest);
    setSearchQuery('');
    setDestinationSuggestions([]);
    setShowSuggestionsDropdown(false);
  };
  
  // Modal state
  const [selectedPlaceForModal, setSelectedPlaceForModal] = useState<Place | null>(null);
  const [selectedPlaceForMapId, setSelectedPlaceForMapId] = useState<string | null>(null);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string>('');


  // Dynamic Application Connectivity Ping (Real-time Online/Offline detection)
  useEffect(() => {
    let isMounted = true;

    const checkConnectivity = async () => {
      if (!navigator.onLine) {
        if (isMounted) {
          setError('Network offline');
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(getApiUrl('/api/health'));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (isMounted) {
          setHealth(data);
          setError(null);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Could not connect to travel services');
          setLoading(false);
        }
      }
    };

    checkConnectivity();
    const interval = setInterval(checkConnectivity, 30000); // 30-second heartbeat ping

    const handleOnline = () => checkConnectivity();
    const handleOffline = () => {
      if (isMounted) {
        setError('Network offline');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Filtered and Ranked Places for Home feed
  const filteredPlaces = useMemo(() => {
    // Score all places using multi-factor recommendation engine
    let places = availablePlaces.map((place) => {
      const scored = scorePlace(place, location.lat, location.lon, preferences, weather);
      return {
        ...place,
        distanceKm: scored.distanceKm,
        travelTimeMin: Math.max(5, Math.round(scored.distanceKm * 2.5 + 4)),
        matchScore: scored.matchScore,
        matchReasons: scored.matchReasons,
        scoreBreakdown: scored.scoreBreakdown,
      };
    });

    places = places.filter((place) => {
      const matchesCategory = selectedCategory === 'all' || place.category === selectedCategory;
      const matchesSearch = searchQuery.trim() === '' || 
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });

    // Apply Hard Filters from preferences
    if (preferences.maxDistanceKm && preferences.maxDistanceKm > 0) {
      places = places.filter((p) => p.distanceKm <= preferences.maxDistanceKm!);
    }
    if (preferences.minRating && preferences.minRating > 0) {
      places = places.filter((p) => p.rating !== undefined && p.rating !== null && p.rating >= preferences.minRating!);
    }
    if (preferences.openNowOnly) {
      places = places.filter((p) => p.isOpenNow === true);
    }

    // Sort descending by matchScore
    places.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    return places;
  }, [availablePlaces, selectedCategory, searchQuery, location, preferences, weather]);


  const toggleSavePlace = (placeId: string) => {
    const place = knownPlacesMap[placeId] || availablePlaces.find((p) => p.id === placeId);
    if (place) {
      toggleTripPlace(place);
    }
  };

  const handleExploreNearMe = async () => {
    await detectLocation();
    const el = document.getElementById('discovery-section');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const getSectionTitle = () => {
    if (searchQuery.trim()) {
      return `Search Results for "${searchQuery}"`;
    }
    switch (selectedCategory) {
      case 'temples':
        return `Sacred Temples & Shrines near ${location.city}`;
      case 'history':
        return `Historic Landmarks & Citadels in ${location.city}`;
      case 'food':
        return `Must-Try Local Food & Culinary Heritage in ${location.city}`;
      case 'cafes':
        return `Heritage Cafes & Irani Chai Spots near ${location.city}`;
      case 'nature':
        return `Waterfronts, Lakes & Scenic Parks near ${location.city}`;
      case 'architecture':
        return `Royal Palaces & Architectural Wonders in ${location.city}`;
      case 'shopping':
        return `Traditional Bazaars & Shopping Streets in ${location.city}`;
      case 'photography':
        return `Top Scenic Photography Vantage Points in ${location.city}`;
      case 'culture':
        return `Artisan Villages & Folk Cultural Venues in ${location.city}`;
      default:
        return `Top Recommended Matches for You in ${location.city}`;
    }
  };

  const getStyleEmoji = () => {
    switch (preferences.travelStyle) {
      case 'solo': return '🎒 Solo';
      case 'couple': return '💑 Couple';
      case 'family': return '👨‍👩‍👧 Family';
      case 'friends': return '👥 Friends';
    }
  };

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      currentCity={location.formatted}
      onOpenLocationModal={() => setIsLocationModalOpen(true)}
      backendHealth={{
        status: health?.status || 'unknown',
        loading,
        error,
      }}
      savedPlacesCount={savedPlaceIds.length}
    >
      {/* Location Selector Modal */}
      <LocationModal />

      {/* Travel Profile & Preferences Modal */}
      <PreferencesModal />

      {/* Place Details Modal */}
      <PlaceDetailsModal
        place={selectedPlaceForModal}
        isOpen={!!selectedPlaceForModal}
        onClose={() => setSelectedPlaceForModal(null)}
        isSaved={selectedPlaceForModal ? savedPlaceIds.includes(selectedPlaceForModal.id) : false}
        onToggleSave={toggleSavePlace}
        onViewOnMap={(p) => {
          setSelectedPlaceForMapId(p.id);
          setActiveTab('map');
        }}
      />

      {/* ============================================================== */}
      {/* TAB 1: HOME FEED */}
      {/* ============================================================== */}
      {activeTab === 'home' && (
        <div className="space-y-12 sm:space-y-16 animate-fadeIn">
          
          {/* HERO SECTION */}
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-50/70 via-white to-white border border-sky-100/80 p-6 sm:p-10 md:p-12 text-center shadow-xs">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-sky-200/30 blur-3xl -z-10 rounded-full pointer-events-none" />

            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 border border-sky-200/80 text-sky-800 text-xs font-semibold mb-5 shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>AI-Powered Local Travel Guide</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl mx-auto leading-[1.15]">
              Explore Every City Like a{' '}
              <span className="text-sky-600">Local</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Discover places, food, culture, and hidden gems around you. Plan smarter routes and make the most of your time.
            </p>

            {/* Travel Preferences Summary Banner (Hero level) */}
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-2 p-1.5 px-3 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-xs text-amber-900 shadow-2xs">
              <span className="font-bold flex items-center gap-1">
                <span>Trip Profile:</span>
                <span>{getStyleEmoji()}</span>
              </span>
              <span className="text-amber-400">•</span>
              <span>{preferences.availableHours}h Available</span>
              <span className="text-amber-400">•</span>
              <span>₹{preferences.budgetAmount.toLocaleString()} Budget</span>
              <span className="text-amber-400">•</span>
              <span className="capitalize">{preferences.pace} Pace</span>
              <button
                type="button"
                onClick={() => setIsPreferencesModalOpen(true)}
                className="ml-1 text-sky-700 hover:text-sky-800 font-bold underline cursor-pointer"
              >
                Customize
              </button>
            </div>

            {/* Location Status Alert / Toast */}
            {locationStatus === 'denied' && (
              <div className="mt-5 max-w-md mx-auto p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 shadow-2xs text-left">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>GPS denied. Choose your city manually:</span>
                </div>
                <button
                  onClick={() => setIsLocationModalOpen(true)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] shrink-0 cursor-pointer"
                >
                  Pick City
                </button>
              </div>
            )}

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
              <button 
                onClick={handleExploreNearMe}
                disabled={locationStatus === 'detecting'}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-md shadow-orange-500/20 active:scale-98 transition-all duration-150 cursor-pointer min-h-[48px] disabled:opacity-75"
              >
                {locationStatus === 'detecting' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Detecting GPS Location...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    <span>Explore Near Me</span>
                  </>
                )}
              </button>

              <button 
                onClick={() => {
                  const el = document.getElementById('plan-day-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-semibold text-sm active:scale-98 transition-all duration-150 cursor-pointer min-h-[48px]"
              >
                <Route className="w-4 h-4 text-sky-600" />
                <span>Plan My Trip</span>
              </button>
            </div>

            {/* Search Bar with Destination Auto-Complete */}
            <div className="mt-8 max-w-xl mx-auto relative">
              <div className="relative flex items-center shadow-xs rounded-2xl bg-white border border-slate-200 focus-within:border-sky-500 focus-within:ring-3 focus-within:ring-sky-100 transition-all p-1.5 z-20">
                <div className="pl-3.5 text-slate-400">
                  <Search className="w-5 h-5 text-sky-600" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (destinationSuggestions.length > 0) setShowSuggestionsDropdown(true);
                  }}
                  placeholder="Search destination (e.g. Tirupati, Rajahmundry) or local places..."
                  className="w-full px-3 py-2 text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none font-medium"
                />
                {isSearchingDestinations && (
                  <div className="pr-2">
                    <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                  </div>
                )}
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSuggestionsDropdown(false);
                    }}
                    className="mr-2 text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Destination Suggestions Autocomplete Dropdown */}
              {showSuggestionsDropdown && destinationSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-30 text-left animate-fadeIn">
                  <div className="p-2.5 bg-sky-50/70 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-600" />
                      <span>Switch Destination to:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSuggestionsDropdown(false)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  <div className="max-h-56 overflow-y-auto p-1 divide-y divide-slate-50">
                    {destinationSuggestions.map((dest, idx) => (
                      <button
                        key={`${dest.city}-${dest.lat}-${idx}`}
                        type="button"
                        onClick={() => handleSelectDestination(dest)}
                        className="w-full p-2.5 rounded-xl hover:bg-sky-50 text-left transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                            📍
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 group-hover:text-sky-700 block">
                              {dest.city}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate max-w-xs">
                              {dest.formatted || `${dest.area}, ${dest.state}`}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-sky-600 group-hover:translate-x-0.5 transition-transform">
                          Select →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Popular Destination Chips */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-500">
                <span className="font-semibold text-slate-400 text-[11px]">Popular Hubs:</span>
                {[
                  { city: 'Tirupati', lat: 13.6288, lon: 79.4192, state: 'Andhra Pradesh', area: 'Tirumala / City Center', formatted: 'Tirupati, Andhra Pradesh' },
                  { city: 'Rajahmundry', lat: 17.0005, lon: 81.8040, state: 'Andhra Pradesh', area: 'Godavari Ghats / Danavaipeta', formatted: 'Rajahmundry, Andhra Pradesh' },
                  { city: 'Hyderabad', lat: 17.3616, lon: 78.4747, state: 'Telangana', area: 'Old City / Charminar', formatted: 'Near Charminar, Hyderabad' },
                  { city: 'Visakhapatnam', lat: 17.6868, lon: 83.2185, state: 'Andhra Pradesh', area: 'RK Beach / Rushikonda', formatted: 'Visakhapatnam, Andhra Pradesh' },
                  { city: 'Goa', lat: 15.4909, lon: 73.8278, state: 'Goa', area: 'Panaji / North Coast', formatted: 'Near Panaji, Goa' },
                ].map((hub) => {
                  const isActive = (location.city || '').toLowerCase() === hub.city.toLowerCase();
                  return (
                    <button
                      key={hub.city}
                      type="button"
                      onClick={() => handleSelectDestination(hub)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'bg-white hover:bg-sky-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {hub.city}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* WEATHER CONTEXT STRIP (Phase 13) */}
          <section className="animate-fadeIn">
            <WeatherCard />
          </section>

          {/* POPULAR CATEGORIES */}
          <section id="discovery-section">
            <CategoryPills
              selectedCategory={selectedCategory}
              onSelectCategory={(catId) => {
                setSelectedCategory(catId);
                setSearchQuery('');
              }}
            />
          </section>

          {/* LIVE DISCOVERY vs DEMO FALLBACK BANNER */}
          <section className="animate-fadeIn">
            <div 
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border text-xs shadow-2xs transition-all ${
                isLiveDiscovery 
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
                  : 'bg-amber-50/80 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                  isLiveDiscovery ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                }`}>
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>{isLiveDiscovery ? 'LIVE ATTRACTIONS' : 'CURATED HIGHLIGHTS'}</span>
                </span>
                <span className="font-medium">
                  {isLiveDiscovery 
                    ? `Showing ${totalFound} attractions around ${location.city}.`
                    : `Showing curated highlights for ${location.city}. Allow location access to discover places near you.`
                  }
                </span>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
                {isLoadingNearby ? (
                  <div className="flex items-center space-x-1.5 text-slate-500 font-semibold text-[11px] px-2 py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                    <span>Finding nearby places...</span>
                  </div>
                ) : isLiveDiscovery ? (
                  <>
                    <button
                      type="button"
                      onClick={() => discoverNearbyPlaces(location.lat, location.lon)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer"
                      title="Re-query nearby POIs"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh</span>
                    </button>
                    <button
                      type="button"
                      onClick={useDemoFallback}
                      className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-semibold text-[11px] transition-all cursor-pointer"
                    >
                      View Curated
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleExploreNearMe}
                    className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer shadow-2xs"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Find Near Me</span>
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* RECOMMENDED PLACES FEED */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-1">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {selectedCategory === 'all' 
                      ? `Personalized for You (${getStyleEmoji()} • ${preferences.availableHours}h)`
                      : 'Category Discovery'}
                  </span>
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {getSectionTitle()}
                </h2>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <Info className="w-3.5 h-3.5 text-sky-500" />
                <span>Location: {location.formatted}</span>
              </div>
            </div>

            {filteredPlaces.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlaces.map((place: Place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    isSaved={savedPlaceIds.includes(place.id)}
                    onToggleSave={toggleSavePlace}
                    onViewDetails={(p) => setSelectedPlaceForModal(p)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">No places found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No destinations match your search or filter. Try switching back to "All Highlights" or clearing your search.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </section>

          {/* PLAN YOUR PERFECT DAY */}
          <section id="plan-day-section">
            <PlanDayWidget />
          </section>

        </div>
      )}

      {/* TAB 2: EXPLORE DIRECTORY VIEW */}
      {activeTab === 'explore' && (
        <ExploreView
          onViewDetails={(p) => setSelectedPlaceForModal(p)}
          savedPlaceIds={savedPlaceIds}
          onToggleSave={toggleSavePlace}
        />
      )}

      {/* TAB 2.5: FOOD EXPLORER VIEW */}
      {activeTab === 'food' && (
        <FoodExplorerView
          onViewOnMap={(foodPlace) => {
            registerPlace(foodPlace);
            setSelectedPlaceForMapId(foodPlace.id);
            setActiveTab('map');
          }}
          onViewDetails={(foodPlace) => setSelectedPlaceForModal(foodPlace)}
        />
      )}

      {/* TAB 3: MAP VIEW (INTERACTIVE MAP) */}
      {activeTab === 'map' && (
        <MapView
          places={availablePlaces}
          onViewDetails={(p) => setSelectedPlaceForModal(p)}
          savedPlaceIds={savedPlaceIds}
          onToggleSave={toggleSavePlace}
          initialSelectedPlaceId={selectedPlaceForMapId}
        />
      )}

      {/* TAB 4: PLAN VIEW */}
      {activeTab === 'plan' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Plan View Top Header Banner */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold mb-2">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Smart Day Trip Planner</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">Custom Day Plan & Itinerary</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Configure your available hours, budget, and travel pace to preview optimized routes.
              </p>
            </div>

            <button
              onClick={() => setIsPreferencesModalOpen(true)}
              className="self-start sm:self-auto flex items-center space-x-2 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-2xl text-xs font-bold transition-all shadow-2xs cursor-pointer group"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 group-hover:rotate-12 transition-transform" />
              <span>Edit Travel Profile ({getStyleEmoji()} • {preferences.pace})</span>
            </button>
          </div>

          {/* Interactive Plan Day Widget */}
          <PlanDayWidget />
        </div>
      )}

      {/* TAB 5: AI GUIDE */}
      {activeTab === 'ai' && (
        <AIGuideView
          initialPrompt={aiInitialPrompt}
          onPromptHandled={() => setAiInitialPrompt('')}
        />
      )}

      {/* TAB 6: MY TRIP ROUTE & ITINERARY */}
      {activeTab === 'mytrip' && (
        <TripRouteView
          onViewPlaceDetails={(p) => setSelectedPlaceForModal(p)}
          onNavigateToMap={() => setActiveTab('map')}
          onExploreMore={() => setActiveTab('explore')}
          onNavigateToFood={() => setActiveTab('food')}
          onNavigateToAI={(initialPrompt) => {
            setAiInitialPrompt(initialPrompt || '');
            setActiveTab('ai');
          }}
        />
      )}

      {/* Floating Action Pill: View Route */}
      {tripPlaces.length > 0 && activeTab !== 'mytrip' && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-40 animate-slideUp">
          <button
            onClick={() => setActiveTab('mytrip')}
            className="px-4 py-3 bg-slate-900/90 hover:bg-slate-900 text-white rounded-2xl shadow-xl hover:shadow-2xl border border-slate-700/60 backdrop-blur-md transition-all flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-xs">
              {tripPlaces.length}
            </div>
            <div className="text-left pr-1">
              <span className="text-[10px] uppercase font-bold text-orange-400 block tracking-wider">
                My Trip Route
              </span>
              <span className="text-xs font-bold text-slate-100 group-hover:text-white">
                {tripRoute.totalDistanceKm} km · View Route →
              </span>
            </div>
          </button>
        </div>
      )}

    </MainLayout>
  );
}

export default function App() {
  return (
    <LocationProvider>
      <WeatherProvider>
        <PlacesProvider>
          <PreferencesProvider>
            <TripProvider>
              <FoodProvider>
                <MainAppContent />
              </FoodProvider>
            </TripProvider>
          </PreferencesProvider>
        </PlacesProvider>
      </WeatherProvider>
    </LocationProvider>
  );
}
