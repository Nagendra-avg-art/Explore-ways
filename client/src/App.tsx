import { useState, useEffect } from 'react';
import { MainLayout, NavTab } from './layouts/MainLayout';
import { 
  MapPin, 
  Route, 
  Sparkles, 
  Search, 
  Clock, 
  Car, 
  Star, 
  Heart, 
  Footprints, 
  Bus, 
  CheckCircle2,
  Sparkle
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
  const [savedCount, setSavedCount] = useState<number>(2);

  // Poll or check health on initial mount
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

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      currentCity="Hyderabad, IN"
      backendHealth={{
        status: health?.status || 'unknown',
        loading,
        error
      }}
      savedPlacesCount={savedCount}
    >
      {/* ============================================================== */}
      {/* TRAVEL DESIGN SYSTEM VALIDATION & HERO SECTION */}
      {/* ============================================================== */}
      <div className="space-y-10">
        
        {/* HERO CONTAINER */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-sky-50/70 via-white to-white border border-sky-100/80 p-6 sm:p-10 md:p-12 text-center shadow-xs">
          {/* Subtle sunlit backdrop glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-sky-200/30 blur-3xl -z-10 rounded-full pointer-events-none" />

          {/* Friendly Travel Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-sky-100/80 border border-sky-200/80 text-sky-800 text-xs font-semibold mb-5 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            <span>AI-Powered Local Travel Guide</span>
          </div>

          {/* Main Hero Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl mx-auto leading-[1.15]">
            Explore Every City Like a{' '}
            <span className="text-sky-600">Local</span>
          </h1>

          {/* Friendly Subtitle */}
          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            Discover places, food, culture, and hidden gems around you. Plan smarter routes and make the most of your time.
          </p>

          {/* High-Contrast Travel CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
            {/* Primary Action: Sunset Orange */}
            <button 
              onClick={() => setActiveTab('explore')}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-md shadow-orange-500/20 active:scale-98 transition-all duration-150 cursor-pointer"
            >
              <MapPin className="w-4 h-4" />
              <span>Explore Near Me</span>
            </button>

            {/* Secondary Action: Sky Blue Soft Tint */}
            <button 
              onClick={() => setActiveTab('plan')}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-semibold text-sm active:scale-98 transition-all duration-150 cursor-pointer"
            >
              <Route className="w-4 h-4 text-sky-600" />
              <span>Plan My Trip</span>
            </button>
          </div>

          {/* Destination Search Input Bar */}
          <div className="mt-8 max-w-xl mx-auto">
            <div className="relative flex items-center shadow-xs rounded-2xl bg-white border border-slate-200 focus-within:border-sky-500 focus-within:ring-3 focus-within:ring-sky-100 transition-all p-1.5">
              <div className="pl-3.5 text-slate-400">
                <Search className="w-5 h-5 text-sky-600" />
              </div>
              <input
                type="text"
                placeholder="Where do you want to explore? (e.g., Charminar, Biryani, Forts...)"
                className="w-full px-3 py-2 text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none font-medium"
              />
              <button 
                onClick={() => setActiveTab('explore')}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer hidden sm:block"
              >
                Search
              </button>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* DESIGN SYSTEM TOKENS VALIDATION DASHBOARD */}
        {/* ============================================================== */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Phase 2.1 Verification</span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">Travel Design Tokens & Identity</h2>
            </div>
            <div className="flex items-center space-x-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Light-First Identity Active</span>
            </div>
          </div>

          {/* Color Tokens & Usage Preview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-100">
              <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-xs mb-2">
                OB
              </div>
              <span className="text-xs font-bold text-slate-900 block">Ocean Blue</span>
              <span className="text-[11px] text-slate-500">Primary Brand & Nav</span>
            </div>

            <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-100">
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs mb-2">
                TE
              </div>
              <span className="text-xs font-bold text-slate-900 block">Teal / Emerald</span>
              <span className="text-[11px] text-slate-500">Secondary & Nature</span>
            </div>

            <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-100">
              <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-xs shadow-xs mb-2">
                SO
              </div>
              <span className="text-xs font-bold text-slate-900 block">Sunset Orange</span>
              <span className="text-[11px] text-slate-500">High-Priority Actions</span>
            </div>

            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs mb-2">
                GA
              </div>
              <span className="text-xs font-bold text-slate-900 block">Golden Amber</span>
              <span className="text-[11px] text-slate-500">Ratings & Highlights</span>
            </div>
          </div>

          {/* Transport Micro-Palette Demonstration */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Transport Type Token Chips (Time + Cost Clarity)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <Footprints className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">Walking</span>
                  <span className="text-[11px] text-emerald-700 font-medium">₹0 • 15 min</span>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-sky-50 border border-sky-200/80">
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                  <Bus className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-sky-950 block">Bus / Metro</span>
                  <span className="text-[11px] text-sky-700 font-medium">₹20 • 25 min</span>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <span className="font-bold text-xs">🛺</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-950 block">Auto Rickshaw</span>
                  <span className="text-[11px] text-amber-700 font-medium">₹90–₹120 • 12 min</span>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-purple-50 border border-purple-200/80">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                  <Car className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-purple-950 block">Cab / Taxi</span>
                  <span className="text-[11px] text-purple-700 font-medium">₹180–₹240 • 8 min</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/* PHOTOGRAPHY-FIRST PLACE CARD DESIGN PREVIEW */}
        {/* ============================================================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600">Component Preview</span>
              <h2 className="text-xl font-bold text-slate-900">Destination Card Component</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Photography-centric travel card</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Charminar Sample */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow group">
              {/* Destination Image Container */}
              <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1572445271230-a78b5944a659?auto=format&fit=crop&w=800&q=80"
                  alt="Charminar Hyderabad"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                  loading="lazy"
                />
                {/* Category Pill Tag */}
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-lg shadow-xs">
                  🏛️ Historical Monument
                </div>
                {/* Heart / Save Button */}
                <button 
                  onClick={() => setSavedCount(prev => prev + 1)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-xs text-slate-600 hover:text-rose-500 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                  title="Save to My Trip"
                >
                  <Heart className="w-4 h-4" />
                </button>
                {/* Rating Badge */}
                <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-xs flex items-center space-x-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <span>4.6</span>
                  <span className="text-slate-400 font-normal">(14.2k)</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-3.5">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Charminar</h3>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                    16th-century landmark mosque with 4 grand minarets and bustling local bazaars.
                  </p>
                </div>

                {/* Scannable Metadata Chips */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100">
                    <MapPin className="w-3 h-3 text-sky-600" />
                    <span>4.2 km away</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100">
                    <Car className="w-3 h-3 text-amber-600" />
                    <span>14 min</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Visit: 1–2 hrs</span>
                  </span>
                </div>

                {/* AI / Recommendation Explanation Callout */}
                <div className="p-2.5 rounded-xl bg-sky-50/80 border border-sky-100/90 text-xs text-sky-900 flex items-start space-x-2">
                  <Sparkle className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Why recommended:</strong> Matches your interest in architecture & history; fits inside your morning window.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex items-center gap-2">
                  <button className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer">
                    View Details
                  </button>
                  <button 
                    onClick={() => setSavedCount(prev => prev + 1)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    + Add to Trip
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Golconda Fort Sample */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow group">
              {/* Destination Image Container */}
              <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80"
                  alt="Golconda Fort Hyderabad"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-lg shadow-xs">
                  🏰 Ancient Citadel
                </div>
                <button 
                  onClick={() => setSavedCount(prev => prev + 1)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-xs text-slate-600 hover:text-rose-500 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                  title="Save to My Trip"
                >
                  <Heart className="w-4 h-4" />
                </button>
                <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-xs flex items-center space-x-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <span>4.7</span>
                  <span className="text-slate-400 font-normal">(18.6k)</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 space-y-3.5">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Golconda Fort</h3>
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                    Sprawling medieval fortress famed for acoustics, royal palaces, and panoramic sunset views.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100">
                    <MapPin className="w-3 h-3 text-sky-600" />
                    <span>8.5 km away</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100">
                    <Car className="w-3 h-3 text-amber-600" />
                    <span>24 min</span>
                  </span>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Visit: 2–3 hrs</span>
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-orange-50/80 border border-orange-100/90 text-xs text-orange-950 flex items-start space-x-2">
                  <Sparkle className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Why recommended:</strong> Top-rated scenic landmark; best visited between 3 PM and 6 PM for sunset.
                  </span>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer">
                    View Details
                  </button>
                  <button 
                    onClick={() => setSavedCount(prev => prev + 1)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                  >
                    + Add to Trip
                  </button>
                </div>
              </div>
            </div>

          </div>
        </section>

      </div>
    </MainLayout>
  );
}
