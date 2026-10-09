import React from 'react';
import { useWeather } from '../../context/WeatherContext';
import { useLocation } from '../../context/LocationContext';
import { HourlyWeather } from './HourlyWeather';
import { 
  CloudRain, 
  Wind, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  MapPin,
  Thermometer
} from 'lucide-react';

interface WeatherCardProps {
  compact?: boolean;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ compact = false }) => {
  const { weather, loading, error, refreshWeather, isHourlyExpanded, setIsHourlyExpanded } = useWeather();
  const { location } = useLocation();

  const activeCityName = location?.city || weather?.location?.city || 'Current Area';

  if (loading && !weather) {
    return (
      <div 
        id="weather-card-loading"
        className="p-4 rounded-2xl bg-white border border-slate-200/90 flex items-center justify-between text-xs text-slate-600 shadow-2xs animate-pulse"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <span className="font-bold text-slate-800 block">Loading Weather Forecast...</span>
            <span className="text-[11px] text-slate-500">
              Fetching current conditions for {activeCityName}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div 
        id="weather-card-unavailable"
        className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 flex items-center justify-between text-xs text-slate-600 shadow-2xs"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-800 block">Weather unavailable</span>
            <span className="text-[11px] text-slate-500">
              Forecast information could not be loaded right now.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={refreshWeather}
          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-sky-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!weather) {
    return (
      <div 
        id="weather-card-empty"
        className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 flex items-center justify-between text-xs text-slate-600 shadow-2xs"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-800 block">Weather unavailable</span>
            <span className="text-[11px] text-slate-500">
              Forecast information could not be loaded right now.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={refreshWeather}
          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-sky-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
        >
          Try again
        </button>
      </div>
    );
  }

  const { current, hourlyForecast } = weather;

  if (compact) {
    return (
      <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-sky-50/70 border border-sky-100/90 text-xs text-slate-700">
        <span className="text-base select-none">{current.icon}</span>
        <span className="font-bold text-slate-900">{current.temperature}°C</span>
        <span className="text-slate-500 font-medium hidden sm:inline">{current.condition}</span>
        {current.precipitationProbability > 0 && (
          <span className="text-sky-700 font-semibold flex items-center space-x-0.5">
            <CloudRain className="w-3 h-3 text-sky-600" />
            <span>{current.precipitationProbability}%</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div 
      id="weather-summary-card"
      className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50/70 via-white to-slate-50/70 border border-sky-100/90 shadow-2xs space-y-3.5 transition-all"
    >
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Weather Condition & Temperature */}
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white border border-sky-100 flex items-center justify-center text-3xl shrink-0 shadow-2xs select-none">
            {current.icon}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {current.temperature}°C
              </span>
              <span className="text-xs font-bold text-sky-800 px-2.5 py-0.5 rounded-full bg-sky-100/80 border border-sky-200/60">
                {current.condition}
              </span>
            </div>
            {/* Active City Name */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>{activeCityName}</span>
            </div>
          </div>
        </div>

        {/* Middle/Sub: Rain Probability & Feels like */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/70 text-slate-700 font-medium flex items-center space-x-1.5 shadow-2xs">
            <CloudRain className="w-3.5 h-3.5 text-sky-600" />
            <span>Rain {current.precipitationProbability}%</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/70 text-slate-700 font-medium flex items-center space-x-1.5 shadow-2xs">
            <Thermometer className="w-3.5 h-3.5 text-amber-500" />
            <span>Feels like {current.feelsLike}°C</span>
          </div>
          {current.windSpeedKmh > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200/70 text-slate-700 font-medium hidden md:flex items-center space-x-1.5 shadow-2xs">
              <Wind className="w-3.5 h-3.5 text-slate-500" />
              <span>{current.windSpeedKmh} km/h</span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-1.5 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={refreshWeather}
            title="Refresh forecast"
            className="p-2 text-slate-400 hover:text-sky-700 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsHourlyExpanded(!isHourlyExpanded)}
            className="px-3 py-1.5 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200/80 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer shadow-2xs"
          >
            <span>{isHourlyExpanded ? 'Hide' : 'Hourly'}</span>
            {isHourlyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Hourly Forecast Preview / Strip */}
      {!isHourlyExpanded && hourlyForecast && hourlyForecast.length > 0 && (
        <div className="pt-2 border-t border-sky-100/70 flex items-center space-x-2 overflow-x-auto scrollbar-none pb-0.5">
          {hourlyForecast.slice(0, 5).map((item, idx) => (
            <div 
              key={`preview-${item.time}-${idx}`}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-white/80 border border-slate-100 text-xs shrink-0 shadow-2xs"
            >
              <span className="font-semibold text-slate-500 text-[11px]">{item.time}</span>
              <span className="text-sm select-none">{item.icon}</span>
              <span className="font-bold text-slate-800">{item.temperature}°</span>
              {item.precipitationProbability > 0 && (
                <span className="text-[10px] text-sky-600 font-semibold">{item.precipitationProbability}%</span>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setIsHourlyExpanded(true)}
            className="text-[11px] text-sky-700 hover:text-sky-900 font-semibold px-2 py-1 shrink-0 cursor-pointer"
          >
            +more
          </button>
        </div>
      )}

      {/* Full Hourly Breakdown when expanded */}
      {isHourlyExpanded && hourlyForecast && hourlyForecast.length > 0 && (
        <HourlyWeather items={hourlyForecast.slice(0, 8)} />
      )}
    </div>
  );
};
