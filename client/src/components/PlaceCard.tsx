import React from 'react';
import { MapPin, Car, Clock, Star, Heart, Sparkles, Check } from 'lucide-react';
import { Place } from '../types/travel';

interface PlaceCardProps {
  place: Place;
  isSaved?: boolean;
  onToggleSave?: (placeId: string) => void;
  onViewDetails?: (place: Place) => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  isSaved = false,
  onToggleSave,
  onViewDetails,
}) => {
  return (
    <article className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      {/* Top Image & Floating Badges */}
      <div>
        <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
          <img
            src={place.imageUrl}
            alt={place.name}
            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
            loading="lazy"
          />
          
          {/* Category Chip */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-lg shadow-xs">
            {place.categoryLabel}
          </div>

          {/* Heart / Save Button */}
          <button
            onClick={() => onToggleSave?.(place.id)}
            aria-label={isSaved ? `Remove ${place.name} from trip` : `Save ${place.name} to trip`}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center shadow-xs transition-colors cursor-pointer ${
              isSaved
                ? 'bg-rose-50 text-rose-600 ring-2 ring-rose-300'
                : 'bg-white/95 backdrop-blur-xs text-slate-600 hover:text-rose-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>

          {/* Star Rating Badge */}
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-xs flex items-center space-x-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>{place.rating.toFixed(1)}</span>
            <span className="text-slate-400 font-normal">({(place.reviewCount / 1000).toFixed(1)}k)</span>
          </div>

          {/* Open / Closed Status Pill */}
          {place.isOpenNow !== undefined && (
            <div className={`absolute bottom-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-xs shadow-xs flex items-center space-x-1.5 ${
              place.isOpenNow 
                ? 'bg-emerald-950/85 text-emerald-300' 
                : 'bg-slate-900/85 text-slate-300'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${place.isOpenNow ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span>{place.isOpenNow ? 'Open Now' : 'Closed'}</span>
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="p-5 space-y-3.5">
          <div>
            <h3 className="font-bold text-lg text-slate-900 group-hover:text-sky-700 transition-colors">
              {place.name}
            </h3>
            <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
              {place.shortDescription}
            </p>
          </div>

          {/* Scannable Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100">
              <MapPin className="w-3 h-3 text-sky-600" />
              <span>{place.distanceKm} km away</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100">
              <Car className="w-3 h-3 text-amber-600" />
              <span>{place.travelTimeMin} min</span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-100">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{place.visitDuration}</span>
            </span>
            {place.entryFee && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-semibold text-[11px]">
                <span>🎟️ {place.entryFee.split('/')[0].trim()}</span>
              </span>
            )}
          </div>

          {/* Recommendation Rationale Callout */}
          <div className="p-2.5 rounded-xl bg-sky-50/80 border border-sky-100 text-xs text-sky-950 flex items-start space-x-2">
            <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
            <span className="leading-tight">
              <strong>Why recommended:</strong> {place.whyRecommended}
            </span>
          </div>
        </div>
      </div>

      {/* Card Action Buttons */}
      <div className="px-5 pb-5 pt-1 flex items-center gap-2">
        <button
          onClick={() => onViewDetails?.(place)}
          className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer text-center"
        >
          View Details
        </button>
        <button
          onClick={() => onToggleSave?.(place.id)}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs flex items-center justify-center space-x-1.5 ${
            isSaved
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-sky-600 hover:bg-sky-700 text-white'
          }`}
        >
          {isSaved ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>In My Trip</span>
            </>
          ) : (
            <span>+ Add to Trip</span>
          )}
        </button>
      </div>
    </article>
  );
};
