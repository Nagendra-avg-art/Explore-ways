import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Star, 
  Car, 
  Clock, 
  X, 
  Heart, 
  Check, 
  Layers, 
  Crosshair
} from 'lucide-react';
import { DEMO_PLACES, TRAVEL_CATEGORIES } from '../data/demoPlaces';
import { Place, CategoryId } from '../types/travel';
import { useLocation } from '../context/LocationContext';

interface MapViewProps {
  onViewDetails: (place: Place) => void;
  savedPlaceIds: string[];
  onToggleSave: (placeId: string) => void;
  initialSelectedPlaceId?: string | null;
}

export const MapView: React.FC<MapViewProps> = ({
  onViewDetails,
  savedPlaceIds,
  onToggleSave,
  initialSelectedPlaceId,
}) => {
  const { location } = useLocation();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(() => {
    if (initialSelectedPlaceId) {
      return DEMO_PLACES.find((p) => p.id === initialSelectedPlaceId) || null;
    }
    return null;
  });

  // Filter places based on selectedCategory
  const displayedPlaces = DEMO_PLACES.filter(
    (p) => selectedCategory === 'all' || p.category === selectedCategory
  );

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on user location or Hyderabad default
    const centerLat = location?.lat || 17.3616;
    const centerLon = location?.lon || 78.4747;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLon],
      zoom: 12,
      zoomControl: false, // We'll position custom zoom control if needed
    });

    // Add CartoDB Voyager Light Tiles (Clean, beautiful pastel travel aesthetic)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Zoom controls on top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Deselect place when clicking on empty map canvas
    map.on('click', () => {
      setSelectedPlace(null);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers & Polyline when dependencies change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    // Clear existing markers
    markersGroup.clearLayers();

    // 1. Add User GPS Marker (pulsing blue dot)
    if (location) {
      const userIcon = L.divIcon({
        className: 'user-marker-container',
        html: `<div class="user-gps-marker" title="Your Location (${location.formatted})"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      L.marker([location.lat, location.lon], { icon: userIcon, zIndexOffset: 1000 })
        .bindTooltip(`📍 You are near ${location.city}`, { direction: 'top', offset: [0, -10] })
        .addTo(markersGroup);
    }

    // 2. Add Place Markers
    displayedPlaces.forEach((place) => {
      const isSelected = selectedPlace?.id === place.id;
      const isSaved = savedPlaceIds.includes(place.id);

      // Category icon lookup
      const cat = TRAVEL_CATEGORIES.find((c) => c.id === place.category);
      const iconEmoji = cat?.icon || '📍';

      const customHtml = `
        <div class="relative group cursor-pointer transition-transform duration-200 ${
          isSelected ? 'scale-125 z-50' : 'hover:scale-115'
        }">
          <div class="px-2 py-1 rounded-xl flex items-center space-x-1 border shadow-md ${
            isSelected
              ? 'bg-orange-500 text-white border-white ring-3 ring-orange-300'
              : isSaved
              ? 'bg-emerald-600 text-white border-white'
              : 'bg-white text-slate-800 border-slate-200 hover:border-sky-400'
          }">
            <span class="text-xs">${iconEmoji}</span>
            <span class="text-[11px] font-bold truncate max-w-[70px] sm:max-w-[100px]">${place.name}</span>
          </div>
          <!-- Pin pointer beak -->
          <div class="w-2 h-2 mx-auto rotate-45 -mt-1 ${
            isSelected ? 'bg-orange-500' : isSaved ? 'bg-emerald-600' : 'bg-white'
          }"></div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'custom-place-pin',
        html: customHtml,
        iconSize: [100, 34],
        iconAnchor: [50, 34],
      });

      const marker = L.marker([place.lat, place.lon], { icon: markerIcon });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        setSelectedPlace(place);
        map.panTo([place.lat, place.lon], { animate: true, duration: 0.5 });
      });

      marker.addTo(markersGroup);
    });

    // 3. Draw Route Polyline from User Location to Selected Place or Saved Places
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }

    if (location && selectedPlace) {
      // Connect User -> Selected Place
      const latlngs: [number, number][] = [
        [location.lat, location.lon],
        [selectedPlace.lat, selectedPlace.lon],
      ];

      const polyline = L.polyline(latlngs, {
        color: '#0284c7', // Sky Blue
        weight: 3.5,
        opacity: 0.8,
        dashArray: '6, 8',
      }).addTo(map);

      routePolylineRef.current = polyline;
    }
  }, [location, displayedPlaces, selectedPlace, savedPlaceIds]);

  // Center on User GPS
  const handleCenterOnUser = () => {
    if (!mapInstanceRef.current || !location) return;
    mapInstanceRef.current.flyTo([location.lat, location.lon], 13.5, {
      duration: 1,
    });
  };

  // Fit all destinations
  const handleFitAllPlaces = () => {
    if (!mapInstanceRef.current || displayedPlaces.length === 0) return;
    const latlngs: [number, number][] = displayedPlaces.map((p) => [p.lat, p.lon]);
    if (location) {
      latlngs.push([location.lat, location.lon]);
    }
    const bounds = L.latLngBounds(latlngs);
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600">
            Interactive City Explorer
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Map of Hyderabad & Nearby Sights
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
          <span>Showing {displayedPlaces.length} attractions</span>
        </div>
      </div>

      {/* Main Map Box */}
      <div className="relative w-full h-[65vh] sm:h-[72vh] min-h-[460px] rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm bg-slate-100">
        
        {/* Leaflet Mount Target */}
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Top Category Filter Bar */}
        <div className="absolute top-3 left-3 right-14 sm:right-16 z-20 overflow-x-auto no-scrollbar py-1">
          <div className="flex items-center space-x-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-2xl shadow-md border border-slate-200/80 w-max">
            {TRAVEL_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? `${cat.bgActive} shadow-xs font-bold`
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Floating Control Buttons (Bottom-Left on Desktop / Top-Right on Mobile) */}
        <div className="absolute bottom-6 left-4 z-20 flex flex-col space-y-2">
          <button
            onClick={handleCenterOnUser}
            title="Center on my location"
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 text-xs font-bold shadow-md border border-slate-200 transition-all cursor-pointer hover:text-sky-600 active:scale-95"
          >
            <Crosshair className="w-4 h-4 text-sky-600" />
            <span className="hidden sm:inline">My Location</span>
          </button>

          <button
            onClick={handleFitAllPlaces}
            title="View all places"
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md hover:bg-white text-slate-800 text-xs font-bold shadow-md border border-slate-200 transition-all cursor-pointer hover:text-sky-600 active:scale-95"
          >
            <Layers className="w-4 h-4 text-sky-600" />
            <span className="hidden sm:inline">Fit All Places</span>
          </button>
        </div>

        {/* Floating Place Preview Bottom-Sheet (When marker is clicked) */}
        {selectedPlace && (
          <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-30 animate-slideUp">
            <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-slate-200/90 space-y-3">
              
              {/* Header with Close */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <img
                    src={selectedPlace.imageUrl}
                    alt={selectedPlace.name}
                    className="w-14 h-14 rounded-xl object-cover shrink-0 shadow-2xs"
                  />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 block">
                      {selectedPlace.categoryLabel}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight">
                      {selectedPlace.name}
                    </h3>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-0.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span className="font-bold text-slate-800">{selectedPlace.rating.toFixed(1)}</span>
                      <span>•</span>
                      <span>{selectedPlace.distanceKm} km away</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedPlace(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                  title="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Rationale callout */}
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-sky-50/60 p-2 rounded-xl border border-sky-100/80">
                ✨ {selectedPlace.whyRecommended}
              </p>

              {/* Travel Time & Fares */}
              <div className="flex items-center justify-between text-xs text-slate-600 px-1 font-medium">
                <span className="flex items-center space-x-1">
                  <Car className="w-3.5 h-3.5 text-sky-600" />
                  <span>{selectedPlace.travelTimeMin} min drive</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Visit: {selectedPlace.visitDuration}</span>
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => onViewDetails(selectedPlace)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center"
                >
                  View Details
                </button>
                <button
                  onClick={() => onToggleSave(selectedPlace.id)}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5 shadow-2xs ${
                    savedPlaceIds.includes(selectedPlace.id)
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  {savedPlaceIds.includes(selectedPlace.id) ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>In My Trip</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-3.5 h-3.5" />
                      <span>+ Add to Trip</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
