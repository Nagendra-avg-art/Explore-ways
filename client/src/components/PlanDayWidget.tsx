import React, { useState } from 'react';
import { Clock, IndianRupee, Sparkles, Check, ArrowRight } from 'lucide-react';
import { TimeOption, BudgetOption } from '../types/travel';

interface PlanDayWidgetProps {
  onBuildPlan?: (planConfig: {
    time: TimeOption;
    budget: BudgetOption;
    interests: string[];
  }) => void;
}

export const PlanDayWidget: React.FC<PlanDayWidgetProps> = ({ onBuildPlan }) => {
  const [selectedTime, setSelectedTime] = useState<TimeOption>('4h');
  const [selectedBudget, setSelectedBudget] = useState<BudgetOption>('1000');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    'History',
    'Food',
  ]);
  const [planGenerated, setPlanGenerated] = useState<boolean>(false);

  const timeOptions: { id: TimeOption; label: string; desc: string }[] = [
    { id: '2h', label: '2 Hours', desc: 'Quick Highlights' },
    { id: '4h', label: '4 Hours', desc: 'Half-Day Discovery' },
    { id: 'halfDay', label: '6–8 Hours', desc: 'Standard Day Trip' },
    { id: 'fullDay', label: 'Full Day', desc: 'Complete Immersion' },
  ];

  const budgetOptions: { id: BudgetOption; label: string; tag: string }[] = [
    { id: '500', label: '₹500', tag: 'Budget Friendly' },
    { id: '1000', label: '₹1,000', tag: 'Most Popular' },
    { id: '2000', label: '₹2,000', tag: 'Comfortable' },
    { id: '5000', label: '₹5,000+', tag: 'Premium / Cab' },
  ];

  const interestOptions = [
    { id: 'History', label: '🏛️ History' },
    { id: 'Food', label: '🍴 Local Food' },
    { id: 'Temples', label: '🛕 Temples' },
    { id: 'Nature', label: '🌊 Nature' },
    { id: 'Architecture', label: '🏗️ Architecture' },
    { id: 'Shopping', label: '🛍️ Shopping' },
  ];

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleBuildPlan = () => {
    setPlanGenerated(true);
    onBuildPlan?.({
      time: selectedTime,
      budget: selectedBudget,
      interests: selectedInterests,
    });
  };

  return (
    <section className="bg-gradient-to-br from-white via-sky-50/40 to-teal-50/30 rounded-3xl border border-sky-100/90 p-6 sm:p-10 shadow-xs relative overflow-hidden">
      {/* Subtle background motif */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-teal-200/20 blur-3xl rounded-full pointer-events-none -z-0" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        
        {/* Section Header */}
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

        {/* Step 1: Available Time */}
        <div className="space-y-3">
          <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Clock className="w-4 h-4 text-sky-600" />
            <span>1. How much time do you have?</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {timeOptions.map((opt) => {
              const isSelected = selectedTime === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSelectedTime(opt.id);
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

        {/* Step 2: Budget */}
        <div className="space-y-3">
          <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <IndianRupee className="w-4 h-4 text-emerald-600" />
            <span>2. What is your approximate budget?</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {budgetOptions.map((opt) => {
              const isSelected = selectedBudget === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setSelectedBudget(opt.id);
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

        {/* Step 3: Interests Multi-Select */}
        <div className="space-y-3">
          <label className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>3. What interests you most today? (Select multiple)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {interestOptions.map((opt) => {
              const isSelected = selectedInterests.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    toggleInterest(opt.id);
                    setPlanGenerated(false);
                  }}
                  className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer min-h-[44px] ${
                    isSelected
                      ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button: Sunset Orange */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
          <button
            type="button"
            onClick={handleBuildPlan}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/20 active:scale-98 transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer min-h-[48px]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Build My Custom Plan</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
          <span className="text-xs text-slate-500 text-center sm:text-left">
            Routes, distance, and transport estimates will be automatically calculated.
          </span>
        </div>

        {/* Interactive Itinerary Teaser Confirmation Banner */}
        {planGenerated && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs text-slate-900 space-y-2 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-sm text-emerald-900">
                  Plan Preview Generated: {selectedTime.toUpperCase()} Trip under ₹{selectedBudget}
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Optimized Sequence
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Based on your selection of <strong>{selectedInterests.join(', ')}</strong>, we suggest visiting <strong>Charminar (10:00 AM)</strong> first to avoid peak midday crowds, followed by a 5-minute walk to <strong>Old City Dum Biryani (12:30 PM)</strong>, ending with sunset at <strong>Golconda Fort (3:30 PM)</strong>.
            </p>
          </div>
        )}

      </div>
    </section>
  );
};
