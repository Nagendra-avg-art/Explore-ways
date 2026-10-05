import React from 'react';
import { Check, Footprints, Bus, Car, ArrowRight, Info, ShieldCheck, AlertCircle } from 'lucide-react';
import { TransportMode } from '../types/travel';
import { computeTransportTimeDetails } from '../services/transportTimeService';

export interface TransportComparisonCardProps {
  fromName: string;
  toName: string;
  distanceKm: number;
  isRoadNetwork?: boolean;
  selectedMode: TransportMode;
  onSelectMode: (mode: TransportMode) => void;
  roadDrivingTimeMin?: number;
  className?: string;
  hideHeader?: boolean;
}

export const TransportComparisonCard: React.FC<TransportComparisonCardProps> = ({
  fromName,
  toName,
  distanceKm,
  isRoadNetwork = true,
  selectedMode,
  onSelectMode,
  roadDrivingTimeMin,
  className = '',
  hideHeader = false,
}) => {
  // Compute honest mode-by-mode details from our dedicated Phase 9.2 transport time service
  const modeDetails = computeTransportTimeDetails(distanceKm, roadDrivingTimeMin, isRoadNetwork);

  const modeCards = [
    {
      ...modeDetails.walk,
      iconComponent: Footprints,
      themeColor: 'emerald',
      statusBadgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      ...modeDetails.auto,
      iconEmoji: '🛺',
      themeColor: 'amber',
      statusBadgeColor: 'bg-amber-50 text-amber-900 border-amber-200',
    },
    {
      ...modeDetails.cab,
      iconComponent: Car,
      themeColor: 'indigo',
      statusBadgeColor: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    },
    {
      ...modeDetails.bus,
      iconComponent: Bus,
      themeColor: 'slate',
      statusBadgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
    },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Route Header */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 block">
                Transport Mode Comparison
              </span>
              <span className="px-2 py-0.2 rounded-md bg-sky-100 text-sky-800 text-[10px] font-extrabold">
                Phase 9.2 Real Travel Times
              </span>
            </div>

            <div className="flex items-center space-x-2 text-sm sm:text-base font-extrabold text-slate-900 mt-1">
              <span className="text-slate-500 font-semibold text-xs sm:text-sm">Travel from:</span>
              <span className="truncate max-w-[130px] sm:max-w-[200px] text-slate-900" title={fromName}>
                {fromName}
              </span>
              <ArrowRight className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-[200px] text-slate-900" title={toName}>
                {toName}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {isRoadNetwork ? (
              <span className="px-2.5 py-1 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold flex items-center space-x-1.5 shadow-2xs">
                <span>🛣️</span>
                <span>{distanceKm} km Road Route</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold flex items-center space-x-1">
                <span>📐</span>
                <span>{distanceKm} km Direct</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4 Transport Option Cards: Walking, Auto Rickshaw, Cab, Bus / Metro */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {modeCards.map((m) => {
          const isSelected = selectedMode === m.mode;

          return (
            <button
              key={m.mode}
              type="button"
              onClick={() => onSelectMode(m.mode)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group ${
                isSelected
                  ? 'border-sky-600 bg-sky-50/80 shadow-md ring-2 ring-sky-300'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
              }`}
            >
              {/* Card Header: Icon & Mode Label */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-2xs ${
                      isSelected ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {m.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                      {m.modeLabel}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium block">
                      {m.mode === 'walk'
                        ? 'Pedestrian route'
                        : m.mode === 'auto'
                        ? 'City rickshaw'
                        : m.mode === 'cab'
                        ? 'On-demand cab'
                        : 'Public transit'}
                    </span>
                  </div>
                </div>

                {isSelected ? (
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full border border-slate-200 group-hover:border-sky-400 shrink-0" />
                )}
              </div>

              {/* Required 4 Metrics Rows: Mode, Distance, Travel time, Data/estimate status */}
              <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                {/* 1. Distance */}
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-500 font-medium">Distance:</span>
                  <span
                    className={`font-bold ${
                      m.isAvailable ? 'text-slate-800' : 'text-slate-400 italic text-[11px]'
                    }`}
                  >
                    {m.distanceDisplay}
                  </span>
                </div>

                {/* 2. Travel time */}
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-500 font-medium">Travel time:</span>
                  <span
                    className={`font-black ${
                      m.isAvailable
                        ? 'text-sm text-slate-900'
                        : 'text-xs text-slate-400 italic'
                    }`}
                  >
                    {m.travelTimeDisplay}
                  </span>
                </div>

                {/* 3. Data/estimate status */}
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${m.statusBadgeColor}`}
                  >
                    {m.statusLabel}
                  </span>
                </div>
              </div>

              {/* Selection Indicator Footer */}
              <div className="pt-1 border-t border-slate-100/60">
                {isSelected ? (
                  <div className="text-[10px] font-extrabold text-sky-700 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                    <span>Selected Mode</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-400 group-hover:text-sky-600 transition-colors">
                    Click to select {m.modeLabel.split(' ')[0]} →
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Honest Data Rule Notice */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
        <div className="flex items-center space-x-1.5 font-bold text-slate-800">
          <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span>Phase 9.2 Realistic Travel-Time Notes</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed pl-5">
          • <strong>Walking:</strong> Based on the genuine {distanceKm} km OpenStreetMap road network pedestrian pace (~4.8 km/h).<br />
          • <strong>Auto & Cab:</strong> Derived from real OSRM road travel times with urban traffic and signal variance ranges.<br />
          • <strong>Bus / Metro:</strong> Marked as unavailable until actual GTFS transit schedule lines are connected. No arbitrary times are invented.
        </p>
      </div>

      {/* Selected Mode Notice if Bus / Metro is active */}
      {selectedMode === 'bus' && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start space-x-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Public Transit Note:</strong> Fixed bus/metro schedule lines are not connected for this specific pair. In the itinerary, auto rickshaw time (~{modeDetails.auto.travelTimeDisplay}) will serve as the provisional urban transit baseline.
          </p>
        </div>
      )}
    </div>
  );
};
