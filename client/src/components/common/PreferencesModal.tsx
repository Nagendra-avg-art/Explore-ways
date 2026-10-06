import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Clock, 
  IndianRupee, 
  Check, 
  SlidersHorizontal,
  RotateCcw,
  CheckCircle2,
  MapPin,
  Star
} from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { TRAVEL_CATEGORIES } from '../../data/demoPlaces';
import { CategoryId, TravelPace, TravelStyle } from '../../types/travel';

export const PreferencesModal: React.FC = () => {
  const {
    preferences,
    updatePreferences,
    resetPreferences,
    isPreferencesModalOpen,
    setIsPreferencesModalOpen,
  } = usePreferences();

  // Local draft state so user can tweak and click "Apply" or cancel
  const [draftStyle, setDraftStyle] = useState<TravelStyle>(preferences.travelStyle);
  const [draftPace, setDraftPace] = useState<TravelPace>(preferences.pace);
  const [draftInterests, setDraftInterests] = useState<CategoryId[]>(preferences.interests);
  const [draftHours, setDraftHours] = useState<number>(preferences.availableHours);
  const [draftBudget, setDraftBudget] = useState<number>(preferences.budgetAmount);
  const [draftDistance, setDraftDistance] = useState<number | null>(preferences.maxDistanceKm ?? null);
  const [draftMinRating, setDraftMinRating] = useState<number | null>(preferences.minRating ?? null);
  const [draftOpenNow, setDraftOpenNow] = useState<boolean>(preferences.openNowOnly ?? false);
  const [savedToast, setSavedToast] = useState<boolean>(false);

  // Sync draft when modal opens
  useEffect(() => {
    if (isPreferencesModalOpen) {
      setDraftStyle(preferences.travelStyle);
      setDraftPace(preferences.pace);
      setDraftInterests(preferences.interests);
      setDraftHours(preferences.availableHours);
      setDraftBudget(preferences.budgetAmount);
      setDraftDistance(preferences.maxDistanceKm ?? null);
      setDraftMinRating(preferences.minRating ?? null);
      setDraftOpenNow(preferences.openNowOnly ?? false);
      setSavedToast(false);
    }
  }, [isPreferencesModalOpen, preferences]);

  if (!isPreferencesModalOpen) return null;

  const styleOptions: { id: TravelStyle; title: string; icon: string; desc: string }[] = [
    { id: 'solo', title: 'Solo Explorer', icon: '🎒', desc: 'Flexible, budget-savvy, cafe & photo focused' },
    { id: 'couple', title: 'Couple', icon: '💑', desc: 'Scenic viewpoints, cozy dining & relaxed pace' },
    { id: 'family', title: 'Family', icon: '👨‍👩‍👧', desc: 'Kid/elder-friendly, comfortable stops, gentle walking' },
    { id: 'friends', title: 'Friends Group', icon: '👥', desc: 'Food crawls, buzzing bazaars & lively hotspots' },
  ];

  const paceOptions: { id: TravelPace; title: string; icon: string; desc: string }[] = [
    { id: 'relaxed', title: 'Relaxed', icon: '🐢', desc: '~2h/stop • Leisurely sightseeing & dining' },
    { id: 'moderate', title: 'Moderate', icon: '🚶', desc: '~1-1.5h/stop • Balanced sights and breaks' },
    { id: 'fast', title: 'Fast & Active', icon: '⚡', desc: '~30-45m/stop • Maximum highlights covered' },
  ];

  const categories = TRAVEL_CATEGORIES.filter((c) => c.id !== 'all');

  const timePresets = [2, 4, 6, 8];
  const budgetPresets = [500, 1000, 2500, 5000];

  const toggleDraftInterest = (id: CategoryId) => {
    if (draftInterests.includes(id)) {
      if (draftInterests.length <= 1) return; // Keep at least one
      setDraftInterests(draftInterests.filter((item) => item !== id));
    } else {
      setDraftInterests([...draftInterests, id]);
    }
  };

  const handleApply = () => {
    updatePreferences({
      travelStyle: draftStyle,
      pace: draftPace,
      interests: draftInterests,
      availableHours: draftHours,
      budgetAmount: draftBudget,
      maxDistanceKm: draftDistance,
      minRating: draftMinRating,
      openNowOnly: draftOpenNow,
    });
    setSavedToast(true);
    setTimeout(() => {
      setIsPreferencesModalOpen(false);
      setSavedToast(false);
    }, 400);
  };

  const handleReset = () => {
    resetPreferences();
    setIsPreferencesModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50/50 via-white to-amber-50/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shadow-xs">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Travel Profile & Recommendations</span>
              </h2>
              <p className="text-xs text-slate-500">
                Personalize scoring, duration, budget, distance, and pacing in real time.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsPreferencesModalOpen(false)}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY (Scrollable) */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* SECTION 1: WHO ARE YOU TRAVELLING WITH? */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <span>1. Travel Companions & Style</span>
              </label>
              <span className="text-[11px] text-sky-600 font-semibold capitalize">
                Selected: {draftStyle}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {styleOptions.map((opt) => {
                const isSelected = draftStyle === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraftStyle(opt.id)}
                    className={`flex items-start space-x-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50/80 border-sky-500 shadow-xs ring-1 ring-sky-500'
                        : 'bg-white hover:bg-slate-50/80 border-slate-200'
                    }`}
                  >
                    <span className="text-2xl p-1 bg-white rounded-xl shadow-2xs border border-slate-100 shrink-0">
                      {opt.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${isSelected ? 'text-sky-900' : 'text-slate-800'}`}>
                          {opt.title}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-sky-600 stroke-[3]" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: TRAVEL PACE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Travel Pace
              </label>
              <span className="text-[11px] text-amber-600 font-semibold capitalize">
                {draftPace} Pace
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {paceOptions.map((opt) => {
                const isSelected = draftPace === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDraftPace(opt.id)}
                    className={`flex flex-col p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/70 border-amber-500 shadow-xs ring-1 ring-amber-500'
                        : 'bg-white hover:bg-slate-50/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{opt.icon}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 stroke-[3]" />}
                    </div>
                    <span className={`text-xs font-bold mt-1.5 ${isSelected ? 'text-amber-950' : 'text-slate-800'}`}>
                      {opt.title}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: INTERESTS & PASSIONS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>3. Favorite Interests & Passions (30% Match Weight)</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {draftInterests.length} selected
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const isSelected = draftInterests.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleDraftInterest(cat.id)}
                    className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left ${
                      isSelected
                        ? `${cat.bgActive} shadow-xs`
                        : `${cat.accentColor} hover:bg-slate-50 hover:border-slate-300`
                    }`}
                  >
                    <span className="text-sm shrink-0">{cat.icon}</span>
                    <span className="flex-1 truncate">{cat.label}</span>
                    {isSelected && <Check className="w-3 h-3 stroke-[3] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: TIME AVAILABLE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span>4. Available Time (Visits & Travel)</span>
              </label>
              <span className="text-xs font-extrabold text-sky-700 px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200">
                {draftHours} {draftHours === 1 ? 'Hour' : 'Hours'}
              </span>
            </div>

            {/* Quick Chips */}
            <div className="grid grid-cols-4 gap-2">
              {timePresets.map((hrs) => {
                const isSelected = draftHours === hrs;
                return (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => setDraftHours(hrs)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {hrs} Hours
                  </button>
                );
              })}
            </div>

            {/* Slider */}
            <div className="pt-1">
              <input
                type="range"
                min="1"
                max="12"
                step="1"
                value={draftHours}
                onChange={(e) => setDraftHours(parseInt(e.target.value, 10))}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
                <span>1h (Quick)</span>
                <span>4h (Half Day)</span>
                <span>8h (Full Day)</span>
                <span>12h (Excursion)</span>
              </div>
            </div>
          </div>

          {/* SECTION 5: APPROXIMATE BUDGET */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                <span>5. Daily Trip Budget</span>
              </label>
              <span className="text-xs font-extrabold text-emerald-700 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                ₹{draftBudget.toLocaleString()}
              </span>
            </div>

            {/* Quick Chips */}
            <div className="grid grid-cols-4 gap-2">
              {budgetPresets.map((amt) => {
                const isSelected = draftBudget === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDraftBudget(amt)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Input */}
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-xs text-slate-500 font-medium">Custom Amount:</span>
              <div className="relative flex-1 max-w-[200px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="100"
                  max="50000"
                  step="100"
                  value={draftBudget}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setDraftBudget(isNaN(val) ? 0 : val);
                  }}
                  className="w-full pl-7 pr-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <span className="text-[11px] text-slate-400">
                {draftBudget <= 800 ? 'Budget Explorer' : draftBudget <= 2000 ? 'Comfortable' : 'Premium / Cab & Dining'}
              </span>
            </div>
          </div>

          {/* SECTION 6: FILTERS (Distance Radius, Rating, Open Now) */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <span>6. Discovery Filters (Radius, Rating & Hours)</span>
            </h3>

            {/* Distance Radius */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                <span>Max Distance Radius</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: null, label: 'Any' },
                  { id: 5, label: '< 5 km' },
                  { id: 10, label: '< 10 km' },
                  { id: 20, label: '< 20 km' },
                ].map((item) => (
                  <button
                    key={String(item.id)}
                    type="button"
                    onClick={() => setDraftDistance(item.id)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      draftDistance === item.id
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Minimum Rating */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 flex items-center space-x-1">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Minimum Rating</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: null, label: 'All Ratings' },
                  { id: 4.5, label: '★ 4.5+' },
                  { id: 4.7, label: '★ 4.7+' },
                ].map((item) => (
                  <button
                    key={String(item.id)}
                    type="button"
                    onClick={() => setDraftMinRating(item.id)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      draftMinRating === item.id
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Open Now Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setDraftOpenNow(!draftOpenNow)}
                className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  draftOpenNow
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${draftOpenNow ? 'bg-white animate-pulse' : 'bg-slate-300'}`} />
                  <span>Open Now Only</span>
                </div>
                <span>{draftOpenNow ? 'Active' : 'Off'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer py-1.5 px-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsPreferencesModalOpen(false)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 active:scale-98 transition-all cursor-pointer min-h-[40px]"
            >
              {savedToast ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Preferences Applied!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Save & Apply Travel Profile</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
