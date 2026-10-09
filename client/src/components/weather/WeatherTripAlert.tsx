import React, { useState } from 'react';
import { WeatherTripImpact } from '../../types/weather';
import { Place, TransportMode } from '../../types/travel';
import { HourlyWeather } from './HourlyWeather';
import { CloudRain, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

interface WeatherTripAlertProps {
  weatherImpact: WeatherTripImpact;
  currentStops: Place[];
  activeTransport: TransportMode;
  onApplyOrderSuggestion?: (newOrderIds: string[]) => void;
  onSwitchTransport?: (mode: TransportMode) => void;
}

export const WeatherTripAlert: React.FC<WeatherTripAlertProps> = ({
  weatherImpact,
  currentStops,
  activeTransport,
  onApplyOrderSuggestion,
  onSwitchTransport,
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [showHourly, setShowHourly] = useState<boolean>(false);

  const {
    overallSeverity,
    hasWeatherAlert,
    summary,
    impactItems,
    travelWindowForecast,
    suggestedStopOrder,
    suggestedStopNames,
    alternativeTransportSuggestion,
    isAlternativeOrderDifferent,
  } = weatherImpact;

  // Favorable / Low impact state
  if (!hasWeatherAlert || overallSeverity === 'LOW') {
    return (
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-slate-800">Weather for your trip:</span>
            <span className="text-slate-600">{summary}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowHourly(!showHourly)}
            className="text-[11px] font-bold text-sky-700 hover:text-sky-900 flex items-center space-x-0.5 cursor-pointer"
          >
            <span>{showHourly ? 'Hide' : 'Hourly'}</span>
            {showHourly ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {showHourly && travelWindowForecast.length > 0 && (
          <HourlyWeather items={travelWindowForecast} title="Itinerary Hours Forecast" />
        )}
      </div>
    );
  }

  // Dismissed state (User clicked "Keep current plan")
  if (isDismissed) {
    return (
      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between text-slate-600">
        <div className="flex items-center space-x-2">
          <CloudRain className="w-4 h-4 text-sky-600 shrink-0" />
          <span>Weather alert acknowledged (Current plan preserved).</span>
        </div>
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className="text-sky-700 font-bold hover:underline cursor-pointer"
        >
          View details
        </button>
      </div>
    );
  }

  // Active Alert State (MODERATE, HIGH, SEVERE)
  const isHighOrSevere = overallSeverity === 'HIGH' || overallSeverity === 'SEVERE';

  return (
    <div className={`p-4 sm:p-5 rounded-3xl border shadow-xs space-y-3.5 transition-all animate-fadeIn ${
      isHighOrSevere
        ? 'bg-amber-50/70 border-amber-200/90'
        : 'bg-sky-50/70 border-sky-200/90'
    }`}>
      {/* Top Alert Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center text-xl shrink-0 ${
            isHighOrSevere
              ? 'bg-amber-100/80 border-amber-200 text-amber-800'
              : 'bg-sky-100/80 border-sky-200 text-sky-800'
          }`}>
            {isHighOrSevere ? '⚠️' : '🌦️'}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isHighOrSevere ? 'bg-amber-200/90 text-amber-900' : 'bg-sky-200/90 text-sky-900'
              }`}>
                {overallSeverity} Weather Impact
              </span>
              <span className="text-xs font-bold text-slate-700">
                Weather Alert
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-900 mt-1 leading-snug">
              {summary}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowHourly(!showHourly)}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center space-x-1 shrink-0 cursor-pointer pt-0.5"
        >
          <span>{showHourly ? 'Hide' : 'Forecast'}</span>
          {showHourly ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Specific Impact Reasons List */}
      <div className="space-y-1.5 pt-1">
        {impactItems.map((item, idx) => (
          <div key={idx} className="p-2.5 rounded-xl bg-white/80 border border-slate-200/80 text-xs space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-slate-800">
              <span>{item.type === 'RAIN' ? '🌧️' : '☀️'}</span>
              <span>{item.reason}</span>
            </div>
            <p className="text-slate-600 text-[11px] pl-5 font-medium leading-relaxed">
              💡 {item.suggestion}
            </p>
          </div>
        ))}
      </div>

      {/* Weather-Aware Transport Switch Suggestion */}
      {alternativeTransportSuggestion && (
        <div className="p-3 rounded-2xl bg-white/95 border border-amber-300/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div>
            <div className="flex items-center space-x-1.5 mb-0.5">
              <span className="font-extrabold text-amber-950">Transport Suggestion</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                Current: {activeTransport.toUpperCase()}
              </span>
            </div>
            <span className="text-slate-600">
              {alternativeTransportSuggestion.reason}
            </span>
          </div>
          {onSwitchTransport && (
            <button
              type="button"
              onClick={() => onSwitchTransport(alternativeTransportSuggestion.toMode as TransportMode)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs flex items-center space-x-1.5 self-start sm:self-auto shadow-2xs"
            >
              <span>Switch to {alternativeTransportSuggestion.toMode.toUpperCase()}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Weather-Aware Reordering Suggestion (Strict User Choice: Apply or Keep) */}
      {isAlternativeOrderDifferent && suggestedStopOrder && suggestedStopNames && (
        <div className="p-3.5 rounded-2xl bg-white/95 border border-sky-300/80 space-y-2 text-xs">
          <div className="font-extrabold text-slate-900 flex items-center space-x-1.5">
            <span>🔄</span>
            <span>Suggested Weather-Optimized Order</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Plan:</span>
              <span className="font-semibold text-slate-700 mt-0.5 block">
                {currentStops.map((s) => s.name).join(' → ')}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-sky-50 border border-sky-200">
              <span className="text-[10px] font-bold text-sky-700 uppercase block">Weather Suggestion:</span>
              <span className="font-bold text-sky-900 mt-0.5 block">
                {suggestedStopNames.join(' → ')}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            {onApplyOrderSuggestion && (
              <button
                type="button"
                onClick={() => onApplyOrderSuggestion(suggestedStopOrder)}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold transition-all text-xs flex items-center space-x-1.5 cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Apply suggestion</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-all text-xs cursor-pointer"
            >
              Keep current plan
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Hourly Forecast */}
      {showHourly && travelWindowForecast.length > 0 && (
        <HourlyWeather items={travelWindowForecast} title="Travel Window Hours" />
      )}
    </div>
  );
};
