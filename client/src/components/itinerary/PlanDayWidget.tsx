import React, { useState, useMemo } from 'react';
import { Clock, Sparkles, Check, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { useLocation } from '../../context/LocationContext';
import { usePlaces } from '../../context/PlacesContext';
import { TimeOption, BudgetOption, CategoryId } from '../../types/travel';
import { TRAVEL_CATEGORIES, DEMO_PLACES } from '../../data/demoPlaces';
import { rankPlacesForUser } from '../../services/recommendationEngine';

interface PlanDayWidgetProps {
  onBuildPlan?: (planConfig: {
    time: TimeOption;
    budget: BudgetOption;
    interests: string[];
  }) => void;
}

export const PlanDayWidget: React.FC<PlanDayWidgetProps> = ({ onBuildPlan }) => {
  const { preferences, updatePreferences, setIsPreferencesModalOpen } = usePreferences();
  const { location, setIsLocationModalOpen } = useLocation();
  const { places } = usePlaces();
  const [planGenerated, setPlanGenerated] = useState<boolean>(false);

  const isHyd = Math.abs(location.lat - 17.3616) < 0.25 && Math.abs(location.lon - 78.4747) < 0.25;
  const availablePlaces = places && places.length > 0 ? places : (isHyd ? DEMO_PLACES : []);

  const topDayPlaces = useMemo(() => {
    return rankPlacesForUser(availablePlaces, location.lat, location.lon, preferences).slice(0, 3);
  }, [availablePlaces, location, preferences]);

  // Map hours to TimeOption
  const getTimeOptionFromHours = (hrs: number): TimeOption => {
    if (hrs <= 2) return '2h';
    if (hrs <= 4) return '4h';
    if (hrs <= 7) return 'halfDay';
    return 'fullDay';
  };

  // Map Budget to BudgetOption
  const getBudgetOptionFromAmount = (amt: number): BudgetOption => {
    if (amt <= 500) return '500';
    if (amt <= 1500) return '1000';
    if (amt <= 3500) return '2000';
    return '5000';
  };

  const selectedTime = getTimeOptionFromHours(preferences.availableHours);
  const selectedBudget = getBudgetOptionFromAmount(preferences.budgetAmount);

  const timeOptions: { id: TimeOption; hours: number; label: string; desc: string }[] = [
    { id: '2h', hours: 2, label: '2 Hours', desc: 'Quick Highlights' },
    { id: '4h', hours: 4, label: '4 Hours', desc: 'Half-Day Discovery' },
    { id: 'halfDay', hours: 6, label: '6–8 Hours', desc: 'Standard Day Trip' },
    { id: 'fullDay', hours: 9, label: 'Full Day', desc: 'Complete Immersion' },
  ];

  const budgetOptions: { id: BudgetOption; amount: number; label: string; tag: string }[] = [
    { id: '500', amount: 500, label: '₹500', tag: 'Budget Friendly' },
    { id: '1000', amount: 1000, label: '₹1,000', tag: 'Most Popular' },
    { id: '2000', amount: 2000, label: '₹2,000', tag: 'Comfortable' },
    { id: '5000', amount: 5000, label: '₹5,000+', tag: 'Premium / Cab' },
  ];

  const availableCategories = TRAVEL_CATEGORIES.filter((c) => c.id !== 'all').slice(0, 6);

  const toggleInterest = (catId: CategoryId) => {
    const exists = preferences.interests.includes(catId);
    let newInterests: CategoryId[];
    if (exists) {
      if (preferences.interests.length <= 1) return;
      newInterests = preferences.interests.filter((id) => id !== catId);
    } else {
      newInterests = [...preferences.interests, catId];
    }
    updatePreferences({ interests: newInterests });
    setPlanGenerated(false);
  };

  const handleBuildPlan = () => {
    setPlanGenerated(true);
    onBuildPlan?.({
      time: selectedTime,
      budget: selectedBudget,
      interests: preferences.interests,
    });
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
    <section className="bg-gradient-to-br from-white via-sky-50/40 to-teal-50/30 rounded-3xl border border-sky-100/90 p-6 sm:p-10 shadow-xs relative overflow-hidden">
      {/* Subtle background motif */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-200/20 blur-3xl rounded-full pointer-events-none -z-0" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-100/80 text-teal-800 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              <span>Time & Budget Optimizer</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Plan Your Perfect Day
            </h2>
            <p className="text-sm text-slate-600 max-w-xl">
              Tell us your available time and approximate budget. We will optimize the order, minimize travel backtracking, and recommend what to visit first.
            </p>
          </div>

          {/* Quick Preferences Trigger Pill */}
          <button
            type="button"
            onClick={() => setIsPreferencesModalOpen(true)}
            className="self-center sm:self-auto flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:border-sky-400 hover:bg-sky-50/50 shadow-2xs text-xs font-bold text-slate-700 transition-all cursor-pointer group"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600 group-hover:rotate-12 transition-transform" />
            <span>Profile: {getStyleEmoji()} • {preferences.pace}</span>
            <span className="text-[10px] text-sky-600 font-semibold">(Edit)</span>
          </button>
        </div>

        {/* Step 1: Destination */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-black flex items-center justify-center">1</span>
              <span>Choose Destination</span>
            </label>
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="text-xs text-sky-600 hover:text-sky-700 font-semibold cursor-pointer underline"
            >
              Change Location
            </button>
          </div>
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-2.5">
              <span className="text-xl">📍</span>
              <div>
                <span className="text-xs font-bold text-slate-900 block">{location.formatted}</span>
                <span className="text-[11px] text-slate-500">All routes and travel times will be measured from this location</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsLocationModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Switch City
            </button>
          </div>
        </div>

        {/* Step 2: Interests Multi-Select */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black flex items-center justify-center">2</span>
              <span>Choose Interests</span>
            </label>
            <button
              type="button"
              onClick={() => setIsPreferencesModalOpen(true)}
              className="text-xs text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
            >
              See all categories &gt;
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((cat) => {
              const isSelected = preferences.interests.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleInterest(cat.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer min-h-[44px] ${
                    isSelected
                      ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Available Time */}
        <div className="space-y-3">
          <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-black flex items-center justify-center">3</span>
            <span>Choose Time ({preferences.availableHours}h currently set)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {timeOptions.map((opt) => {
              const isSelected = selectedTime === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    updatePreferences({ availableHours: opt.hours });
                    setPlanGenerated(false);
                  }}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer min-h-[56px] ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm scale-101 font-semibold'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs'
                  }`}
                >
                  <span className="text-sm font-bold">{opt.label}</span>
                  <span className={`text-[11px] mt-0.5 ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Budget */}
        <div className="space-y-3">
          <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center justify-center">4</span>
            <span>Choose Budget (₹{preferences.budgetAmount.toLocaleString()} currently set)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {budgetOptions.map((opt) => {
              const isSelected = selectedBudget === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    updatePreferences({ budgetAmount: opt.amount });
                    setPlanGenerated(false);
                  }}
                  className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer min-h-[56px] ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm scale-101 font-semibold'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs'
                  }`}
                >
                  <span className="text-base font-extrabold">{opt.label}</span>
                  <span className={`text-[11px] mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {opt.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 5: Suggested Places */}
        {topDayPlaces.length > 0 && (
          <div className="space-y-3">
            <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-black flex items-center justify-center">5</span>
              <span>Select Places ({topDayPlaces.length} recommended for your schedule)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topDayPlaces.map((place, idx) => (
                <div key={place.id} className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 block truncate">{place.name}</span>
                      <span className="text-[10px] text-slate-500">{place.categoryLabel} · {place.distanceKm} km</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block self-start">
                    {place.matchScore}% Profile Match
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Build Trip Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
          <button
            type="button"
            onClick={handleBuildPlan}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/20 active:scale-98 transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer min-h-[48px]"
          >
            <Sparkles className="w-4 h-4" />
            <span>6. Build Trip Plan</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
          <span className="text-xs text-slate-500 text-center sm:text-left">
            Optimizes the itinerary timeline, travel legs, and transport estimates.
          </span>
        </div>

        {/* Interactive Itinerary Teaser Confirmation Banner */}
        {planGenerated && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs text-slate-900 space-y-3 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-sm text-emerald-900">
                  Plan Preview Generated: {preferences.availableHours}h Trip under ₹{preferences.budgetAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-emerald-800 font-bold">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100">
                  {getStyleEmoji()} Style
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 capitalize">
                  {preferences.pace} Pace
                </span>
              </div>
            </div>

            {topDayPlaces.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {topDayPlaces.map((stop, idx) => (
                  <div key={stop.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center space-x-2.5">
                    <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-900 block truncate">{stop.name}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        {stop.matchScore}% Match • {idx === 0 ? '10:00 AM' : idx === 1 ? '1:00 PM' : '4:30 PM'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed">
              Based on your active interests in <strong>{preferences.interests.join(', ')}</strong> with a <strong>{preferences.pace}</strong> pace and budget of <strong>₹{preferences.budgetAmount.toLocaleString()}</strong>, your custom day route begins at <strong>{topDayPlaces[0]?.name || 'first stop'}</strong> ({topDayPlaces[0]?.matchReasons?.[0] || 'Top Match'}), continues to <strong>{topDayPlaces[1]?.name || 'second stop'}</strong>, and concludes at <strong>{topDayPlaces[2]?.name || 'final destination'}</strong>.
            </p>
          </div>
        )}

      </div>
    </section>
  );
};
