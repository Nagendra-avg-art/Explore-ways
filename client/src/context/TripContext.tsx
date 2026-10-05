import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Place, TripRoute } from '../types/travel';
import { DEMO_PLACES } from '../data/demoPlaces';
import { useLocation } from './LocationContext';
import { 
  calculateTripRoute, 
  optimizeRouteNearestNeighbor 
} from '../services/routingService';

interface TripContextType {
  tripPlaces: Place[];
  tripPlaceIds: string[];
  addToTrip: (place: Place) => void;
  removeFromTrip: (placeId: string) => void;
  toggleTripPlace: (place: Place) => void;
  isPlaceInTrip: (placeId: string) => boolean;
  clearTrip: () => void;
  moveStopUp: (index: number) => void;
  moveStopDown: (index: number) => void;
  optimizeTripRoute: () => void;
  resetToManualOrder: () => void;
  isOptimized: boolean;
  distanceSavedKm: number;
  tripRoute: TripRoute;
  preferredMode: import('../types/travel').TransportMode;
  setPreferredMode: (mode: import('../types/travel').TransportMode) => void;
}

const STORAGE_KEY = 'smart_travel_trip_place_ids';

const TripContext = createContext<TripContextType | undefined>(undefined);

export const TripProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { location } = useLocation();

  // Load initial saved place IDs from localStorage, defaulting to Charminar and Golconda
  const [manualPlaceIds, setManualPlaceIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return ['charminar', 'golconda'];
  });

  const [isOptimized, setIsOptimized] = useState<boolean>(false);
  const [optimizedPlaceIds, setOptimizedPlaceIds] = useState<string[]>([]);
  const [distanceSavedKm, setDistanceSavedKm] = useState<number>(0);
  const [preferredMode, setPreferredMode] = useState<import('../types/travel').TransportMode>('auto');

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(manualPlaceIds));
    } catch {
      // ignore
    }
  }, [manualPlaceIds]);

  // Convert IDs to Place objects (preserves order)
  const manualStops: Place[] = useMemo(() => {
    return manualPlaceIds
      .map((id) => DEMO_PLACES.find((p) => p.id === id))
      .filter((p): p is Place => Boolean(p));
  }, [manualPlaceIds]);

  // Active places list depending on whether route optimization is enabled
  const activeStops: Place[] = useMemo(() => {
    if (!isOptimized) return manualStops;
    const optPlaces = optimizedPlaceIds
      .map((id) => DEMO_PLACES.find((p) => p.id === id))
      .filter((p): p is Place => Boolean(p));
    return optPlaces.length === manualStops.length ? optPlaces : manualStops;
  }, [isOptimized, optimizedPlaceIds, manualStops]);

  // Active Place IDs
  const tripPlaceIds = useMemo(() => {
    return activeStops.map((p) => p.id);
  }, [activeStops]);

  // Compute TripRoute metrics
  const tripRoute: TripRoute = useMemo(() => {
    const origin = {
      label: location.isManual ? `${location.city} Center (Demo Hub)` : `${location.area || location.city} (Live GPS)`,
      lat: location.lat,
      lon: location.lon,
      isActualGps: !location.isManual,
    };
    return calculateTripRoute(origin, activeStops, isOptimized, distanceSavedKm, preferredMode);
  }, [location, activeStops, isOptimized, distanceSavedKm, preferredMode]);

  // Route Optimization (Nearest Neighbor)
  const optimizeTripRoute = () => {
    if (manualStops.length <= 1) return;
    const res = optimizeRouteNearestNeighbor(
      { lat: location.lat, lon: location.lon },
      manualStops
    );
    setOptimizedPlaceIds(res.orderedStops.map((p) => p.id));
    setDistanceSavedKm(res.distanceSavedKm);
    setIsOptimized(true);
  };

  const resetToManualOrder = () => {
    setIsOptimized(false);
    setDistanceSavedKm(0);
  };

  // Add a place
  const addToTrip = (place: Place) => {
    if (manualPlaceIds.includes(place.id)) return;
    const updated = [...manualPlaceIds, place.id];
    setManualPlaceIds(updated);

    if (isOptimized) {
      // Re-run optimization with the newly added place included
      const allUpdatedPlaces = updated
        .map((id) => DEMO_PLACES.find((p) => p.id === id))
        .filter((p): p is Place => Boolean(p));
      const res = optimizeRouteNearestNeighbor(
        { lat: location.lat, lon: location.lon },
        allUpdatedPlaces
      );
      setOptimizedPlaceIds(res.orderedStops.map((p) => p.id));
      setDistanceSavedKm(res.distanceSavedKm);
    }
  };

  // Remove a place
  const removeFromTrip = (placeId: string) => {
    const updated = manualPlaceIds.filter((id) => id !== placeId);
    setManualPlaceIds(updated);

    if (isOptimized) {
      const allUpdatedPlaces = updated
        .map((id) => DEMO_PLACES.find((p) => p.id === id))
        .filter((p): p is Place => Boolean(p));
      const res = optimizeRouteNearestNeighbor(
        { lat: location.lat, lon: location.lon },
        allUpdatedPlaces
      );
      setOptimizedPlaceIds(res.orderedStops.map((p) => p.id));
      setDistanceSavedKm(res.distanceSavedKm);
    }
  };

  // Toggle place in trip
  const toggleTripPlace = (place: Place) => {
    if (manualPlaceIds.includes(place.id)) {
      removeFromTrip(place.id);
    } else {
      addToTrip(place);
    }
  };

  const isPlaceInTrip = (placeId: string): boolean => {
    return manualPlaceIds.includes(placeId);
  };

  const clearTrip = () => {
    setManualPlaceIds([]);
    setOptimizedPlaceIds([]);
    setIsOptimized(false);
    setDistanceSavedKm(0);
  };

  // Manual re-ordering
  const moveStopUp = (index: number) => {
    if (index <= 0 || index >= activeStops.length) return;
    setIsOptimized(false); // Manual move resets auto-optimized mode
    setDistanceSavedKm(0);
    const updated = [...manualPlaceIds];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setManualPlaceIds(updated);
  };

  const moveStopDown = (index: number) => {
    if (index < 0 || index >= activeStops.length - 1) return;
    setIsOptimized(false);
    setDistanceSavedKm(0);
    const updated = [...manualPlaceIds];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setManualPlaceIds(updated);
  };

  return (
    <TripContext.Provider
      value={{
        tripPlaces: activeStops,
        tripPlaceIds,
        addToTrip,
        removeFromTrip,
        toggleTripPlace,
        isPlaceInTrip,
        clearTrip,
        moveStopUp,
        moveStopDown,
        optimizeTripRoute,
        resetToManualOrder,
        isOptimized,
        distanceSavedKm,
        tripRoute,
        preferredMode,
        setPreferredMode,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = (): TripContextType => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
};
