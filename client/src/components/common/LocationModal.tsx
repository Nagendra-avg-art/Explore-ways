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
import { getApiUrl } from '../../services/apiConfig';

const POPULAR_CITIES: GeoLocation[] = [
  { city: 'Tirupati', area: 'Tirumala / City Center', state: 'Andhra Pradesh', country: 'India', lat: 13.6288, lon: 79.4192, formatted: 'Tirupati, Andhra Pradesh' },
  { city: 'Rajahmundry', area: 'Godavari Ghats / Danavaipeta', state: 'Andhra Pradesh', country: 'India', lat: 17.0005, lon: 81.8040, formatted: 'Rajahmundry, Andhra Pradesh' },
  { city: 'Visakhapatnam', area: 'RK Beach / Rushikonda', state: 'Andhra Pradesh', country: 'India', lat: 17.6868, lon: 83.2185, formatted: 'Visakhapatnam, Andhra Pradesh' },
  { city: 'Vijayawada', area: 'Kanaka Durga / MG Road', state: 'Andhra Pradesh', country: 'India', lat: 16.5062, lon: 80.6480, formatted: 'Vijayawada, Andhra Pradesh' },
  { city: 'Hyderabad', area: 'Old City / Charminar', state: 'Telangana', country: 'India', lat: 17.3616, lon: 78.4747, formatted: 'Near Charminar, Hyderabad' },
  { city: 'Bengaluru', area: 'Indiranagar / MG Road', state: 'Karnataka', country: 'India', lat: 12.9716, lon: 77.5946, formatted: 'Near Indiranagar, Bengaluru' },
  { city: 'Chennai', area: 'Marina / Mylapore', state: 'Tamil Nadu', country: 'India', lat: 13.0827, lon: 80.2707, formatted: 'Near Marina, Chennai' },
  { city: 'Mumbai', area: 'Colaba / Gateway', state: 'Maharashtra', country: 'India', lat: 18.9220, lon: 72.8347, formatted: 'Near Colaba, Mumbai' },
  { city: 'Delhi', area: 'Connaught Place', state: 'Delhi', country: 'India', lat: 28.6315, lon: 77.2167, formatted: 'Near CP, Central Delhi' },
  { city: 'Goa', area: 'Panaji / North Coast', state: 'Goa', country: 'India', lat: 15.4909, lon: 73.8278, formatted: 'Near Panaji, Goa' },
  { city: 'Jaipur', area: 'Pink City / Hawa Mahal', state: 'Rajasthan', country: 'India', lat: 26.9239, lon: 75.8267, formatted: 'Near Pink City, Jaipur' },
  { city: 'Varanasi', area: 'Dashashwamedh Ghat', state: 'Uttar Pradesh', country: 'India', lat: 25.3176, lon: 82.9739, formatted: 'Near Ghats, Varanasi' },
  { city: 'Kochi', area: 'Fort Kochi', state: 'Kerala', country: 'India', lat: 9.9656, lon: 76.2421, formatted: 'Near Fort Kochi, Kochi' },
  { city: 'Kolkata', area: 'Park Street / Victoria', state: 'West Bengal', country: 'India', lat: 22.5726, lon: 88.3639, formatted: 'Near Park Street, Kolkata' },
];

export const LocationModal: React.FC = () => {
  const { 
    location, 
    destination,
    currentLocation,
    status, 
    errorMessage, 
    detectLocation, 
    setDestination, 
    useCurrentLocationAsDestination,
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
        const res = await fetch(getApiUrl(`/api/location/search?q=${encodeURIComponent(searchQuery)}`));
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch (err) {
        console.warn('Location search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

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
              <h3 className="font-bold text-base sm:text-lg text-slate-900">Choose Travel Destination</h3>
              <p className="text-xs text-slate-500">Select active city or detect device GPS</p>
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
          
          {/* Current Device GPS Status Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-sky-600" />
                <span className="text-xs font-bold text-slate-700">Device Location (GPS)</span>
              </div>
              {currentLocation ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Detected
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">
                  {status === 'detecting' ? 'Detecting...' : 'Unavailable'}
                </span>
              )}
            </div>

            {currentLocation ? (
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-xs font-semibold text-slate-800 truncate">
                  📍 {currentLocation.formatted}
                </span>
                <button
                  type="button"
                  onClick={useCurrentLocationAsDestination}
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-bold shrink-0 cursor-pointer shadow-2xs transition-colors"
                >
                  Use as Destination
                </button>
              </div>
            ) : (
              <button
                onClick={detectLocation}
                disabled={status === 'detecting'}
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-sky-50 border border-slate-200 text-sky-700 text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 shadow-2xs"
              >
                {status === 'detecting' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin" />
                    <span>Acquiring GPS Signal...</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-3.5 h-3.5 text-sky-600" />
                    <span>Acquire Device GPS Location</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Alert message if permission denied */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">GPS Assistance</span>
                <p className="text-amber-800 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Search Any Destination or City
            </label>
            <div className="relative flex items-center rounded-2xl bg-slate-50 border border-slate-200 focus-within:bg-white focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100 transition-all p-1">
              <div className="pl-3 text-slate-400">
                <Search className="w-4 h-4 text-sky-600" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type destination (e.g. Tirupati, Rajahmundry, Goa...)"
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
              <div className="max-h-44 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-1">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    onClick={() => setDestination(res)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-sky-50 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-sky-700">
                        {res.formatted || `${res.city}, ${res.state}`}
                      </span>
                    </div>
                    <span className="text-[10px] text-sky-600 font-bold">Select</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Popular Cities Grid */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Popular Travel Hubs
            </span>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {POPULAR_CITIES.map((city) => {
                const isSelected = (destination?.city || location?.city || '').toLowerCase() === city.city.toLowerCase();
                return (
                  <button
                    key={city.city}
                    onClick={() => setDestination(city)}
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
          <div className="truncate max-w-[280px]">
            <span>Active Destination: <strong>{destination.formatted || location.formatted}</strong></span>
          </div>
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
