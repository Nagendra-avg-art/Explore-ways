import { useState, useEffect, useMemo } from 'react';
import { MainLayout, NavTab } from './layouts/MainLayout';
import { CategoryPills } from './components/CategoryPills';
import { PlaceCard } from './components/PlaceCard';
import { PlanDayWidget } from './components/PlanDayWidget';
import { PlaceDetailsModal } from './components/PlaceDetailsModal';
import { LocationModal } from './components/LocationModal';
import { ExploreView } from './components/ExploreView';
import { LocationProvider, useLocation } from './context/LocationContext';
import { DEMO_PLACES } from './data/demoPlaces';
import { CategoryId, Place } from './types/travel';
import { 
  MapPin, 
  Route, 
  Sparkles, 
  Search, 
  Info, 
  Compass, 
  Map as MapIcon, 
  Calendar, 
  Heart, 
  Bot,
  Loader2,
  AlertCircle
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

  // Discovery state
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>(['charminar', 'golconda']);
  
  // Modal state
  const [selectedPlaceForModal, setSelectedPlaceForModal] = useState<Place | null>(null);

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

  // Filtered Places for Home feed
  const filteredPlaces = useMemo(() => {
    return DEMO_PLACES.filter((place) => {
      const matchesCategory = selectedCategory === 'all' || place.category === selectedCategory;
      const matchesSearch = searchQuery.trim() === '' || 
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Saved Places
  const savedPlaces = useMemo(() => {
    return DEMO_PLACES.filter(p => savedPlaceIds.includes(p.id));
  }, [savedPlaceIds]);

  const toggleSavePlace = (placeId: string) => {
    setSavedPlaceIds((prev) =>
      prev.includes(placeId) ? prev.filter((id) => id !== placeId) : [...prev, placeId]
    );
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
        return `Recommended Highlights Near ${location.city}`;
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

      {/* Place Details Modal */}
      <PlaceDetailsModal
        place={selectedPlaceForModal}
        isOpen={!!selectedPlaceForModal}
        onClose={() => setSelectedPlaceForModal(null)}
        isSaved={selectedPlaceForModal ? savedPlaceIds.includes(selectedPlaceForModal.id) : false}
        onToggleSave={toggleSavePlace}
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

          {/* RECOMMENDED PLACES FEED */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 px-1">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
                  {selectedCategory === 'all' ? 'Featured Places' : 'Filtered Discovery'}
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

      {/* TAB 3: MAP VIEW (PHASE 4) */}
      {activeTab === 'map' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-xs animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto shadow-xs">
            <MapIcon className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Upcoming in Phase 4</span>
            <h2 className="text-2xl font-extrabold text-slate-900">Interactive Map View</h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              In Phase 4, we will plot your live GPS coordinates ({location.lat.toFixed(3)}, {location.lon.toFixed(3)}) with destination markers and route lines on an interactive map.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('explore')}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Explore Places in List View
          </button>
        </div>
      )}

      {/* TAB 4: PLAN VIEW */}
      {activeTab === 'plan' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-4 shadow-xs animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Upcoming in Phases 8 & 11</span>
            <h2 className="text-2xl font-extrabold text-slate-900">Multi-Stop Route & Day Planner</h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              In Phases 8 & 11, we will implement distance matrix calculations, travel-time optimization, and sequential itinerary timelines.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('home')}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Try Plan Day Teaser on Home
          </button>
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

      {/* TAB 6: MY TRIP */}
      {activeTab === 'mytrip' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Your Saved Places</span>
              <h2 className="text-2xl font-extrabold text-slate-900">My Saved Trip</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                You have saved <strong>{savedPlaces.length}</strong> destinations to your personal trip list.
              </p>
            </div>
            {savedPlaces.length > 0 && (
              <button 
                onClick={() => setActiveTab('home')}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                + Add More Places
              </button>
            )}
          </div>

          {savedPlaces.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedPlaces.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  isSaved={true}
                  onToggleSave={toggleSavePlace}
                  onViewDetails={(p) => setSelectedPlaceForModal(p)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center mx-auto">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Your trip is empty</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You haven't saved any places yet. Click the heart icon or "+ Add to Trip" on any destination to build your trip.
              </p>
              <button
                onClick={() => setActiveTab('explore')}
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Explore Places Now
              </button>
            </div>
          )}
        </div>
      )}

    </MainLayout>
  );
}

export default function App() {
  return (
    <LocationProvider>
      <MainAppContent />
    </LocationProvider>
  );
}
