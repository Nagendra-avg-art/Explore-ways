import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Search, 
  Compass, 
  AlertCircle, 
  Check, 
  Loader2 
} from 'lucide-react';
import { useLocation } from '../../context/LocationContext';
import { GeoLocation } from '../../types/travel';

const POPULAR_CITIES: GeoLocation[] = [
  { city: 'Hyderabad', area: 'Old City / Charminar', state: 'Telangana', country: 'India', lat: 17.3616, lon: 78.4747, formatted: 'Near Charminar, Hyderabad' },
  { city: 'Mumbai', area: 'Colaba / Gateway', state: 'Maharashtra', country: 'India', lat: 18.9220, lon: 72.8347, formatted: 'Near Colaba, Mumbai' },
  { city: 'Delhi', area: 'Connaught Place', state: 'Delhi', country: 'India', lat: 28.6315, lon: 77.2167, formatted: 'Near CP, Central Delhi' },
  { city: 'Bengaluru', area: 'Indiranagar / MG Road', state: 'Karnataka', country: 'India', lat: 12.9716, lon: 77.5946, formatted: 'Near Indiranagar, Bengaluru' },
  { city: 'Goa', area: 'Panaji / North Coast', state: 'Goa', country: 'India', lat: 15.4909, lon: 73.8278, formatted: 'Near Panaji, Goa' },
  { city: 'Jaipur', area: 'Pink City / Hawa Mahal', state: 'Rajasthan', country: 'India', lat: 26.9239, lon: 75.8267, formatted: 'Near Pink City, Jaipur' },
  { city: 'Varanasi', area: 'Dashashwamedh Ghat', state: 'Uttar Pradesh', country: 'India', lat: 25.3176, lon: 82.9739, formatted: 'Near Ghats, Varanasi' },
  { city: 'Kochi', area: 'Fort Kochi', state: 'Kerala', country: 'India', lat: 9.9656, lon: 76.2421, formatted: 'Near Fort Kochi, Kochi' },
];

export const LocationModal: React.FC = () => {
  const { 
    location, 
    status, 
    errorMessage, 
    detectLocation, 
    setManualLocation, 
    isLocationModalOpen, 
    setIsLocationModalOpen 
  } = useLocation();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search API
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/location/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.warn('Location search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLocationModalOpen(false);
    };
    if (isLocationModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocationModalOpen, setIsLocationModalOpen]);

  if (!isLocationModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0" 
        onClick={() => setIsLocationModalOpen(false)} 
        aria-hidden="true" 
      />

      <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900">Choose Your Location</h3>
              <p className="text-xs text-slate-500">Detect GPS or select a destination manually</p>
            </div>
          </div>
          <button
            onClick={() => setIsLocationModalOpen(false)}
            aria-label="Close location picker"
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto no-scrollbar">
          
          {/* Geolocation Status / Alert message if denied */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Location Assistance</span>
                <p className="text-amber-800 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Detect GPS Button */}
          <button
            onClick={detectLocation}
            disabled={status === 'detecting'}
            className="w-full py-3 px-4 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 shadow-2xs"
          >
            {status === 'detecting' ? (
              <>
                <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                <span>Acquiring GPS Satellite Signal...</span>
              </>
            ) : (
              <>
                <Compass className="w-4 h-4 text-sky-600" />
                <span>Use Current Device Location (GPS)</span>
              </>
            )}
          </button>

          {/* Search Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Search Any City or Neighborhood
            </label>
            <div className="relative flex items-center rounded-2xl bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all p-1">
              <div className="pl-3 text-slate-400">
                <Search className="w-4 h-4 text-sky-600" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type city or area (e.g. Hyderabad, Colaba, Jaipur...)"
                className="w-full px-3 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none font-medium"
              />
              {isSearching && (
                <div className="pr-3">
                  <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Search Results List */}
          {searchResults.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-xs font-bold text-slate-400 block px-1">Search Results:</span>
              <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-1">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => setManualLocation(res)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-sky-50 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-sky-700">
                        {res.formatted}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">Select</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Cities Grid */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Popular Travel Destinations
            </span>
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_CITIES.map((city) => {
                const isSelected = location.city.toLowerCase() === city.city.toLowerCase();
                return (
                  <button
                    key={city.city}
                    onClick={() => setManualLocation(city)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-sky-50 border-sky-300 text-sky-900 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block">{city.city}</span>
                      <span className="text-[10px] text-slate-500 block line-clamp-1">{city.area}</span>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-sky-600 stroke-[3]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Active: <strong>{location.formatted}</strong></span>
          <button
            onClick={() => setIsLocationModalOpen(false)}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
