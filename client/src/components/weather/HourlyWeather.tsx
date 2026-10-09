import React from 'react';
import { HourlyForecastItem } from '../../types/weather';

interface HourlyWeatherProps {
  items: HourlyForecastItem[];
  title?: string;
}

export const HourlyWeather: React.FC<HourlyWeatherProps> = ({ 
  items, 
  title = 'Travel Window Forecast' 
}) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-2 pt-2 border-t border-slate-100 animate-fadeIn">
      <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase tracking-wider">
        <span>{title}</span>
        <span className="text-[10px] text-slate-400 font-normal">Next {items.length} hours</span>
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-200">
        {items.map((item, idx) => {
          const isRainy = item.precipitationProbability >= 40 || item.conditionType === 'rain';
          const isHighHeat = item.temperature >= 35;

          return (
            <div
              key={`${item.time}-${idx}`}
              className={`shrink-0 flex flex-col items-center justify-between p-2.5 rounded-2xl border text-center transition-all min-w-[70px] ${
                isRainy
                  ? 'bg-blue-50/70 border-blue-200/90 text-blue-950'
                  : isHighHeat
                  ? 'bg-amber-50/70 border-amber-200/90 text-amber-950'
                  : 'bg-slate-50/80 border-slate-100 text-slate-700'
              }`}
            >
              <span className="text-[10px] font-bold text-slate-500">
                {item.time}
              </span>
              <span className="text-xl my-1 select-none" role="img" aria-label={item.condition}>
                {item.icon}
              </span>
              <span className="text-xs font-black text-slate-900">
                {item.temperature}°
              </span>
              <span className={`text-[10px] font-bold mt-1 ${
                item.precipitationProbability >= 40 ? 'text-blue-700 font-extrabold' : 'text-slate-400'
              }`}>
                {item.precipitationProbability > 0 ? `${item.precipitationProbability}%` : '0%'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
