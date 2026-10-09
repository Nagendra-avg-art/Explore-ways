import React, { useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Clock, 
  Star, 
  Heart, 
  Check, 
  Sparkles, 
  Utensils, 
  Car, 
  CalendarCheck,
  Map as MapIcon,
  Navigation,
  Footprints,
  Bus,
  ExternalLink
} from 'lucide-react';
import { Place } from '../../types/travel';
import { useLocation } from '../../context/LocationContext';
import { calculateHaversineDistanceKm, estimateTransportModes, formatDistanceKm } from '../../services/routingService';

interface PlaceDetailsModalProps {
  place: Place | null;
  isOpen: boolean;
  onClose: () => void;
  isSaved?: boolean;
  onToggleSave?: (placeId: string) => void;
  onViewOnMap?: (place: Place) => void;
}

export const PlaceDetailsModal: React.FC<PlaceDetailsModalProps> = ({
  place,
  isOpen,
  onClose,
  isSaved = false,
  onToggleSave,
  onViewOnMap,
}) => {
  const { location } = useLocation();
  const [imageError, setImageError] = React.useState(false);

  // Reset imageError when place changes
  useEffect(() => {
    setImageError(false);
  }, [place?.id]);

  // Close on Escape key press & prevent background scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !place) return null;

  const distanceKm = calculateHaversineDistanceKm(location.lat, location.lon, place.lat, place.lon);
  const routeOptions = estimateTransportModes(distanceKm);

  const getCategoryEmoji = (cat: string) => {
    switch (cat) {
      case 'temples': return '🛕';
      case 'history': return '🏛️';
      case 'nature': return '🌊';
      case 'food': return '🍴';
      case 'architecture': return '🏗️';
      case 'cafes': return '☕';
      case 'shopping': return '🛍️';
      case 'photography': return '📸';
      case 'culture': return '🎭';
      default: return '📍';
    }
  };

  const hasValidPhoto = Boolean(place.imageUrl && place.imageUrl.trim().length > 0 && !imageError);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200">
      
      {/* Backdrop tap to close */}
      <div 
        className="absolute inset-0" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      {/* Modal Dialog Card */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-place-title"
        className="relative z-10 w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-y-auto no-scrollbar flex flex-col justify-between border border-slate-200"
      >
        
        {/* ============================================================== */}
        {/* MODAL HEADER WITH PHOTOGRAPHY OR CLEAN PLACEHOLDER */}
        {/* ============================================================== */}
        <div className="relative h-64 sm:h-72 w-full bg-slate-100 shrink-0">
          {hasValidPhoto ? (
            <img
              src={place.imageUrl}
              alt={place.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-sky-950 flex flex-col items-center justify-center p-6 text-center select-none">
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-4xl mb-3 shadow-lg">
                {getCategoryEmoji(place.category)}
              </div>
              <span className="text-sm font-bold text-white/90">
                {place.categoryLabel || 'Local Attraction'}
              </span>
              <span className="text-xs text-white/60 mt-0.5">
                Verified Location · {place.address || location.city}
              </span>
            </div>
          )}
          {/* Subtle gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-black/30 pointer-events-none" />

          {/* Top Bar with Category, Address & Close Button */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="bg-white/95 backdrop-blur-md text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md">
                {place.categoryLabel}
              </span>
              {place.source === 'live' ? (
                <span className="bg-emerald-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  <span>Live Location</span>
                </span>
              ) : (
                <span className="bg-amber-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md">
                  Curated
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              aria-label="Close details"
              className="w-9 h-9 rounded-full bg-white/95 backdrop-blur-md text-slate-700 hover:text-slate-900 hover:bg-white flex items-center justify-center shadow-md transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Title and Rating on Bottom of Image */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center space-x-2 text-xs font-bold mb-1">
              {place.rating !== undefined && place.rating !== null ? (
                <div className="flex items-center space-x-1 text-amber-300">
                  <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                  <span>{place.rating.toFixed(1)}</span>
                  {place.reviewCount ? (
                    <span className="text-white/80 font-normal">({(place.reviewCount / 1000).toFixed(1)}k reviews)</span>
                  ) : null}
                </div>
              ) : (
                <span className="text-white/70 font-medium">Unrated · Live location</span>
              )}
            </div>
            <h2 id="modal-place-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {place.name}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-white/90 mt-1 font-medium">
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-sky-400" />
                <span>{place.distanceKm} km away</span>
              </span>
              {place.address && (
                <>
                  <span>•</span>
                  <span>📍 {place.address}</span>
                </>
              )}
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>Recommended: {place.visitDuration}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MODAL BODY */}
        {/* ============================================================== */}
        <div className="p-6 sm:p-8 space-y-6 flex-1 text-slate-800">
          
          {/* Recommendation Match Analysis & Rationale */}
          {place.matchScore !== undefined ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-sky-50/60 to-white border border-emerald-200/80 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4 fill-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Match Breakdown</span>
                    <h4 className="text-sm font-extrabold text-slate-900">{place.matchScore}% Match for Your Travel Profile</h4>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black">
                  {place.matchScore >= 90 ? 'Top Match' : 'Recommended'}
                </span>
              </div>

              {/* Personalized Match Reasons */}
              {place.matchReasons && place.matchReasons.length > 0 && (
                <div className="space-y-1.5 pl-0.5">
                  {place.matchReasons.map((reason, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span className="leading-snug">{reason}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Multi-Factor Score Breakdown */}
              {place.scoreBreakdown && (
                <div className="pt-2 border-t border-emerald-100 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Match Factors Breakdown
                  </span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                    <div>
                      <div className="flex justify-between text-slate-600 mb-0.5">
                        <span>Interest Match</span>
                        <span className="font-bold text-slate-800">{place.scoreBreakdown.interest}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-500 rounded-full" style={{ width: `${place.scoreBreakdown.interest}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-600 mb-0.5">
                        <span>Proximity</span>
                        <span className="font-bold text-slate-800">{place.scoreBreakdown.distance}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${place.scoreBreakdown.distance}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-600 mb-0.5">
                        <span>Time Window</span>
                        <span className="font-bold text-slate-800">{place.scoreBreakdown.timeFit}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${place.scoreBreakdown.timeFit}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-600 mb-0.5">
                        <span>Style Affinity</span>
                        <span className="font-bold text-slate-800">{place.scoreBreakdown.styleFit}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: `${place.scoreBreakdown.styleFit}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-sky-50/90 border border-sky-100/90 flex items-start space-x-3">
              <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-sky-950 block">Why Recommended For You</span>
                <p className="text-xs text-sky-900 mt-0.5 leading-relaxed">
                  {place.whyRecommended}
                </p>
              </div>
            </div>
          )}

          {/* About / Historical Background */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              About This Destination
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {place.fullDescription || place.shortDescription}
            </p>
          </div>

          {/* Practical Visit Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium mb-1">
                <CalendarCheck className="w-3.5 h-3.5 text-sky-600" />
                <span>Opening Hours</span>
              </div>
              <span className="text-xs font-bold text-slate-800">
                {place.openingHours || (place.source === 'live' ? 'Hours not listed on OpenStreetMap' : 'Regular Daytime Hours')}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center space-x-2 text-slate-500 text-xs font-medium mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Best Time To Visit</span>
              </div>
              <span className="text-xs font-bold text-slate-800">
                {place.bestTimeToVisit || 'Morning or Late Afternoon'}
              </span>
            </div>
          </div>

          {/* Nearby Local Food Recommendations */}
          {place.nearbyFood && place.nearbyFood.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Utensils className="w-3.5 h-3.5 text-orange-500" />
                <span>Nearby Food & Local Delicacies</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {place.nearbyFood.map((food, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1.5 rounded-xl bg-orange-50/80 border border-orange-200/80 text-orange-950 text-xs font-medium"
                  >
                    🍴 {food}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Phase 8.2 Dynamic Route Options & Travel Times */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Navigation className="w-3.5 h-3.5 text-sky-600" />
                <span>How to Get There · {formatDistanceKm(distanceKm)} away</span>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${location.lat},${location.lon}&destination=${place.lat},${place.lon}&travelmode=driving`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-sky-600 hover:text-sky-700 flex items-center space-x-1"
                title="Open live navigation in Google Maps"
              >
                <span>Live Navigation</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* 1. Walking */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center space-x-1.5 text-slate-700">
                  <Footprints className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold">Walking</span>
                </div>
                <div className="mt-2 space-y-1">
                  <span className="text-sm font-black text-slate-900 block">{routeOptions.walk.timeMin} min</span>
                  <span className="text-[11px] font-bold text-emerald-700 block">Free (₹0)</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block">
                    Road route
                  </span>
                </div>
              </div>

              {/* 2. Auto */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col justify-between">
                <div className="flex items-center space-x-1.5 text-amber-900">
                  <span className="text-sm">🛺</span>
                  <span className="text-xs font-bold">Auto</span>
                </div>
                <div className="mt-2 space-y-1">
                  <span className="text-sm font-black text-slate-900 block">
                    {routeOptions.auto.timeDisplay || `${routeOptions.auto.timeMin} min`}
                  </span>
                  <span className="text-[11px] font-bold text-slate-800 block truncate" title={routeOptions.auto.fareDisplay}>
                    {routeOptions.auto.fareDisplay || 'Estimated'}
                  </span>
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100/80 px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                    Estimated
                  </span>
                </div>
              </div>

              {/* 3. Cab */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center space-x-1.5 text-slate-700">
                  <Car className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold">Cab</span>
                </div>
                <div className="mt-2 space-y-1">
                  <span className="text-sm font-black text-slate-900 block">
                    {routeOptions.cab.timeDisplay || `${routeOptions.cab.timeMin} min`}
                  </span>
                  <span className="text-[11px] font-bold text-slate-800 block truncate" title={routeOptions.cab.fareDisplay}>
                    {routeOptions.cab.fareDisplay || 'Estimated'}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 inline-block">
                    Estimated
                  </span>
                </div>
              </div>

              {/* 4. Bus / Metro */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center space-x-1.5 text-slate-700">
                  <Bus className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="text-xs font-bold">Bus / Metro</span>
                </div>
                <div className="mt-2 space-y-1">
                  <span className="text-sm font-black text-slate-400 italic block">Unavailable</span>
                  <span className="text-[11px] font-medium text-slate-400 italic block">Unavailable</span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block">
                    Not available
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400">
              Estimated travel times and fares from your {location.isManual ? 'selected location' : 'current location'}. Auto and Cab fares are distance-based estimates.
            </p>

            {/* Data Provenance, Official Website & Photo Attribution */}
            <div className="pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-600">Provenance:</span>
                <span>{place.sourceName || (place.provenance === 'curated' ? 'Verified Curated Heritage Record' : 'OpenStreetMap Live Data')}</span>
                {place.confidence && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    place.confidence === 'HIGH' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {place.confidence} CONFIDENCE
                  </span>
                )}
              </div>

              {place.website && (
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-sky-600 hover:text-sky-700 flex items-center space-x-1"
                >
                  <span>Official Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {place.photo?.attribution && (
                <div className="w-full text-[10px] text-slate-400">
                  Photo: {place.photo.attribution}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ============================================================== */}
        {/* MODAL FOOTER ACTIONS */}
        {/* ============================================================== */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>

            {onViewOnMap && (
              <button
                onClick={() => {
                  onClose();
                  onViewOnMap(place);
                }}
                className="px-4 py-3 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                <MapIcon className="w-3.5 h-3.5 text-sky-600" />
                <span>View on Map</span>
              </button>
            )}
          </div>

          <button
            onClick={() => onToggleSave?.(place.id)}
            className={`flex-1 sm:flex-initial sm:min-w-[170px] py-3 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md flex items-center justify-center space-x-2 ${
              isSaved
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Saved In My Trip</span>
              </>
            ) : (
              <>
                <Heart className="w-4 h-4" />
                <span>+ Add to My Trip</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
