import { useState, useEffect, useMemo } from 'react';
import { MainLayout, NavTab } from './layouts/MainLayout';
import { CategoryPills } from './components/CategoryPills';
import { PlaceCard } from './components/PlaceCard';
import { PlanDayWidget } from './components/PlanDayWidget';
import { DEMO_PLACES } from './data/demoPlaces';
import { CategoryId, Place } from './types/travel';
import { 
  MapPin, 
  Route, 
  Sparkles, 
  Search, 
  Info,
  Compass
} from 'lucide-react';

interface BackendHealth {
  status: string;
  message: string;
  version: string;
  demoMode: boolean;
  timestamp: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Discovery state
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savedPlaceIds, setSavedPlaceIds] = useState<string[]>(['charminar', 'golconda']);

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

  // Filtered Places based on Category & Search
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

  // Toggle Save to Trip
  const toggleSavePlace = (placeId: string) => {
    setSavedPlaceIds((prev) =>
      prev.includes(placeId) ? prev.filter((id) => id !== placeId) : [...prev, placeId]
    );
  };

  // Dynamic Section Title
  const getSectionTitle = () => {
    if (searchQuery.trim()) {
      return `Search Results for "${searchQuery}"`;
    }
    switch (selectedCategory) {
      case 'temples':
        return 'Sacred Temples & Shrines Near You';
      case 'history':
        return 'Historic Landmarks & Citadels';
      case 'food':
        return 'Must-Try Local Food & Culinary Heritage';
      case 'cafes':
        return 'Heritage Cafes & Irani Chai Spots';
      case 'nature':
        return 'Waterfronts, Lakes & Scenic Parks';
      case 'architecture':
        return 'Royal Palaces & Architectural Wonders';
      case 'shopping':
        return 'Traditional Bazaars & Shopping Streets';
      case 'photography':
        return 'Top Scenic Photography Vantage Points';
      case 'culture':
        return 'Artisan Villages & Folk Cultural Venues';
      default:
        return 'Recommended Highlights Near You';
    }
  };

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      currentCity="Hyderabad, IN"
      backendHealth={{
        status: health?.status || 'unknown',
        loading,
        error,
      }}
      savedPlacesCount={savedPlaceIds.length}
    >
      <div className="space-y-12 sm:space-y-16">
        
        {/* ============================================================== */}
        {/* 1. HERO SECTION */}
        {/* ============================================================== */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-50/70 via-white to-white border border-sky-100/80 p-6 sm:p-10 md:p-12 text-center shadow-xs">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-sky-200/30 blur-3xl -z-10 rounded-full pointer-events-none" />

          {/* Friendly Travel Tag */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 border border-sky-200/80 text-sky-800 text-xs font-semibold mb-5 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>AI-Powered Local Travel Guide</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl mx-auto leading-[1.15]">
            Explore Every City Like a{' '}
            <span className="text-sky-600">Local</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Discover places, food, culture, and hidden gems around you. Plan smarter routes and make the most of your time.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
            <button 
              onClick={() => {
                setSelectedCategory('all');
                const el = document.getElementById('discovery-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-md shadow-orange-500/20 active:scale-98 transition-all duration-150 cursor-pointer min-h-[48px]"
            >
              <MapPin className="w-4 h-4" />
              <span>Explore Near Me</span>
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

        {/* ============================================================== */}
        {/* 2. POPULAR CATEGORIES (SWIPEABLE) */}
        {/* ============================================================== */}
        <section id="discovery-section">
          <CategoryPills
            selectedCategory={selectedCategory}
            onSelectCategory={(catId) => {
              setSelectedCategory(catId);
              setSearchQuery('');
            }}
          />
        </section>

        {/* ============================================================== */}
        {/* 3. RECOMMENDED NEAR YOU (DYNAMIC FILTERED RESULTS) */}
        {/* ============================================================== */}
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
              <span>Controlled Demo Places ({filteredPlaces.length} available)</span>
            </div>
          </div>

          {/* Place Cards Grid */}
          {filteredPlaces.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlaces.map((place: Place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  isSaved={savedPlaceIds.includes(place.id)}
                  onToggleSave={toggleSavePlace}
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
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold"
              >
                Reset Filters
              </button>
            </div>
          )}
        </section>

        {/* ============================================================== */}
        {/* 4. PLAN YOUR PERFECT DAY WIDGET */}
        {/* ============================================================== */}
        <section id="plan-day-section">
          <PlanDayWidget />
        </section>

      </div>
    </MainLayout>
  );
}
