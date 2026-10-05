import { useState, useEffect, useMemo } from 'react';
import { MainLayout, NavTab } from './layouts/MainLayout';
import { CategoryPills } from './components/CategoryPills';
import { PlaceCard } from './components/PlaceCard';
import { PlanDayWidget } from './components/PlanDayWidget';
import { PlaceDetailsModal } from './components/PlaceDetailsModal';
import { LocationModal } from './components/LocationModal';
import { PreferencesModal } from './components/PreferencesModal';
import { ExploreView } from './components/ExploreView';
import { MapView } from './components/MapView';
import { LocationProvider, useLocation } from './context/LocationContext';
import { PlacesProvider, usePlaces } from './context/PlacesContext';
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { TripProvider, useTrip } from './context/TripContext';
import { TripRouteView } from './components/TripRouteView';
import { DEMO_PLACES } from './data/demoPlaces';
import { CategoryId, Place } from './types/travel';
import { scorePlace } from './services/recommendationEngine';
import { 
  MapPin, 
  Route, 
  Sparkles, 
  Search, 
  Info, 
  Compass, 
  Calendar, 
  Bot,
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
    setIsLocationModalOpen 
  } = useLocation();

  // Preferences Context
  const { preferences, setIsPreferencesModalOpen } = usePreferences();

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
    sourceName,
    totalFound,
    discoverNearbyPlaces,
    useDemoFallback,
    knownPlacesMap
  } = usePlaces();

  // Active candidate places (Live OSM or Demo Fallback)
  const availablePlaces = discoveredPlaces.length > 0 ? discoveredPlaces : DEMO_PLACES;

  // Discovery state
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const savedPlaceIds = tripPlaceIds;
  
  // Modal state
  const [selectedPlaceForModal, setSelectedPlaceForModal] = useState<Place | null>(null);
  const [selectedPlaceForMapId, setSelectedPlaceForMapId] = useState<string | null>(null);

  // Backend Health Ping
  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Could not connect to backend');
        setLoading(false);
      });
  }, []);

  // Filtered and Ranked Places for Home feed
  const filteredPlaces = useMemo(() => {
    // Score all places using multi-factor recommendation engine
    let places = availablePlaces.map((place) => {
      const scored = scorePlace(place, location.lat, location.lon, preferences);
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
  }, [availablePlaces, selectedCategory, searchQuery, location, preferences]);


  const toggleSavePlace = (placeId: string) => {
    const place = knownPlacesMap[placeId] || availablePlaces.find((p) => p.id === placeId) || DEMO_PLACES.find((p) => p.id === placeId);
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

            {/* Search Bar */}
            <div className="mt-8 max-w-xl mx-auto">
              <div className="relative flex items-center shadow-xs rounded-2xl bg-white border border-slate-200 focus-within:border-sky-500 focus-within:ring-3 focus-within:ring-sky-100 transition-all p-1.5">
                <div className="pl-3.5 text-slate-400">
                  <Search className="w-5 h-5 text-sky-600" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Where do you want to explore? (e.g., Charminar, Biryani, Temples...)"
                  className="w-full px-3 py-2 text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mr-2 text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
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
                  <span>{isLiveDiscovery ? 'LIVE POI DISCOVERY' : 'CURATED DEMO HUB'}</span>
                </span>
                <span className="font-medium">
                  {isLiveDiscovery 
                    ? `Discovered ${totalFound} real attractions around ${location.city} via ${sourceName}.`
                    : `Showing curated demonstration highlights for ${location.city}. Allow GPS to discover real nearby places around your current position.`
                  }
                </span>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto shrink-0">
                {isLoadingNearby ? (
                  <div className="flex items-center space-x-1.5 text-slate-500 font-semibold text-[11px] px-2 py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                    <span>Querying OpenStreetMap...</span>
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
                      Switch to Demo
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleExploreNearMe}
                    className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] flex items-center space-x-1 transition-all cursor-pointer shadow-2xs"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Use Real GPS</span>
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
                      ? `AI Personalized Matches (${getStyleEmoji()} • ${preferences.availableHours}h)`
                      : 'Category Discovery'}
                  </span>
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {getSectionTitle()}
                </h2>
              </div>
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <Info className="w-3.5 h-3.5 text-sky-500" />
                <span>Current Hub: {location.formatted}</span>
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
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-xs animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto shadow-xs">
            <Bot className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Upcoming in Phase 12</span>
            <h2 className="text-2xl font-extrabold text-slate-900">Your AI Local Travel Guide</h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              In Phase 12, we will integrate a contextual AI assistant grounded in retrieved destination data for {location.city}.
            </p>
          </div>
        </div>
      )}

      {/* TAB 6: MY TRIP ROUTE & ITINERARY */}
      {activeTab === 'mytrip' && (
        <TripRouteView
          onViewPlaceDetails={(p) => setSelectedPlaceForModal(p)}
          onNavigateToMap={() => setActiveTab('map')}
          onExploreMore={() => setActiveTab('explore')}
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
      <PlacesProvider>
        <PreferencesProvider>
          <TripProvider>
            <MainAppContent />
          </TripProvider>
        </PreferencesProvider>
      </PlacesProvider>
    </LocationProvider>
  );
}
