import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Place, TripRoute } from '../types/travel';
import { DEMO_PLACES } from '../data/demoPlaces';
import { useLocation } from './LocationContext';
import { usePlaces } from './PlacesContext';
import { 
  calculateTripRoute, 
  optimizeRouteNearestNeighbor,
  fetchRealRoadDirections
} from '../services/routingService';
import {
  buildRouteTransportComparison,
  getRepresentativeTravelTimeMin
} from '../services/transportTimeService';

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
  const { knownPlacesMap, registerPlace } = usePlaces();

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

  // Road geometry state (fetched asynchronously from OSRM)
  const [roadGeometry, setRoadGeometry] = useState<{
    routeCoordinates?: [number, number][];
    isRoadNetwork: boolean;
    routingSource?: string;
    totalDistanceKm?: number;
    totalDurationMin?: number;
    legs?: {
      legIndex: number;
      distanceKm: number;
      durationMin: number;
      maneuvers: import('../types/travel').RouteManeuver[];
    }[];
  } | null>(null);

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
      .map((id) => knownPlacesMap[id] || DEMO_PLACES.find((p) => p.id === id))
      .filter((p): p is Place => Boolean(p));
  }, [manualPlaceIds, knownPlacesMap]);

  // Active places list depending on whether route optimization is enabled
  const activeStops: Place[] = useMemo(() => {
    if (!isOptimized) return manualStops;
    const optPlaces = optimizedPlaceIds
      .map((id) => knownPlacesMap[id] || DEMO_PLACES.find((p) => p.id === id))
      .filter((p): p is Place => Boolean(p));
    return optPlaces.length === manualStops.length ? optPlaces : manualStops;
  }, [isOptimized, optimizedPlaceIds, manualStops, knownPlacesMap]);

  // Active Place IDs
  const tripPlaceIds = useMemo(() => {
    return activeStops.map((p) => p.id);
  }, [activeStops]);

  // Asynchronously query real road directions via OSRM when waypoints change
  useEffect(() => {
    if (activeStops.length === 0 || !location) {
      setRoadGeometry(null);
      return;
    }

    let isCancelled = false;
    const waypoints = [
      { lat: location.lat, lon: location.lon },
      ...activeStops.map((p) => ({ lat: p.lat, lon: p.lon }))
    ];

    fetchRealRoadDirections(waypoints, preferredMode).then((res) => {
      if (isCancelled || !res) return;
      setRoadGeometry({
        routeCoordinates: res.coordinates,
        isRoadNetwork: res.isRoadNetwork,
        routingSource: res.source,
        totalDistanceKm: res.totalDistanceKm,
        totalDurationMin: res.totalDurationMin,
        legs: res.legs,
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [location.lat, location.lon, activeStops, preferredMode]);

  // Compute TripRoute metrics (instantly calculated, seamlessly enhanced with road geometry)
  const tripRoute: TripRoute = useMemo(() => {
    const origin = {
      label: location.isManual ? `${location.city} Center (Demo Hub)` : `${location.area || location.city} (Live GPS)`,
      lat: location.lat,
      lon: location.lon,
      isActualGps: !location.isManual,
    };
    const base = calculateTripRoute(origin, activeStops, isOptimized, distanceSavedKm, preferredMode);

    if (roadGeometry && roadGeometry.routeCoordinates && roadGeometry.routeCoordinates.length > 0) {
      const enhancedLegs = base.legs.map((leg, idx) => {
        const roadLeg = roadGeometry.legs?.find((l) => l.legIndex === idx);
        if (roadLeg) {
          const comp = buildRouteTransportComparison(
            leg.fromName,
            leg.toName,
            roadLeg.distanceKm,
            true,
            roadLeg.durationMin,
            roadGeometry.routingSource || 'osrm'
          );
          const repTime = getRepresentativeTravelTimeMin(preferredMode, comp.modes);

          return {
            ...leg,
            distanceKm: roadLeg.distanceKm,
            estimatedTravelTimeMin: repTime,
            isRoadNetwork: true,
            maneuvers: roadLeg.maneuvers,
            transportComparison: comp,
            modeEstimates: {
              walk: {
                timeMin: comp.modes.walk.travelTimeMin || 1,
                costInr: 0,
                label: 'Walking',
                fareDisplay: 'Free (₹0)',
                distanceKm: roadLeg.distanceKm,
                statusLabel: comp.modes.walk.statusLabel,
              },
              auto: {
                timeMin: comp.modes.auto.travelTimeMin || 5,
                costInr: 0,
                costRange: 'Coming next',
                label: 'Auto Rickshaw',
                fareDisplay: 'Coming next',
                distanceKm: roadLeg.distanceKm,
                timeDisplay: comp.modes.auto.travelTimeDisplay,
                statusLabel: comp.modes.auto.statusLabel,
              },
              cab: {
                timeMin: comp.modes.cab.travelTimeMin || 5,
                costInr: 0,
                costRange: 'Coming next',
                label: 'Cab (Ola/Uber)',
                fareDisplay: 'Coming next',
                distanceKm: roadLeg.distanceKm,
                timeDisplay: comp.modes.cab.travelTimeDisplay,
                statusLabel: comp.modes.cab.statusLabel,
              },
              bus: {
                timeMin: 0,
                costInr: 0,
                costRange: 'Unavailable',
                label: 'Bus / Metro',
                fareDisplay: 'Unavailable',
                distanceKm: undefined,
                timeDisplay: 'Unavailable',
                statusLabel: 'Not available',
              },
            },
          };
        }
        return leg;
      });

      const totalTravelTime = enhancedLegs.reduce((acc, l) => acc + l.estimatedTravelTimeMin, 0);

      // Selected mode user-facing time display
      let selectedModeTimeDisplay: string;
      if (preferredMode === 'bus') {
        selectedModeTimeDisplay = 'Unavailable';
      } else if (enhancedLegs.length === 1 && enhancedLegs[0].transportComparison) {
        selectedModeTimeDisplay = enhancedLegs[0].transportComparison.modes[preferredMode].travelTimeDisplay;
      } else {
        selectedModeTimeDisplay = `${totalTravelTime} min`;
      }

      return {
        ...base,
        totalDistanceKm: roadGeometry.totalDistanceKm ?? base.totalDistanceKm,
        totalTravelTimeMin: totalTravelTime,
        totalEstimatedDurationMin: totalTravelTime + base.totalVisitTimeMin,
        legs: enhancedLegs,
        routeCoordinates: roadGeometry.routeCoordinates,
        isRoadNetwork: roadGeometry.isRoadNetwork,
        routingSource: roadGeometry.routingSource,
        selectedModeTimeDisplay,
      };
    }

    return base;
  }, [location, activeStops, isOptimized, distanceSavedKm, preferredMode, roadGeometry]);

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
    registerPlace(place);
    if (manualPlaceIds.includes(place.id)) return;
    const updated = [...manualPlaceIds, place.id];
    setManualPlaceIds(updated);

    if (isOptimized) {
      // Re-run optimization with the newly added place included
      const allUpdatedPlaces = updated
        .map((id) => (id === place.id ? place : knownPlacesMap[id] || DEMO_PLACES.find((p) => p.id === id)))
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
        .map((id) => knownPlacesMap[id] || DEMO_PLACES.find((p) => p.id === id))
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
