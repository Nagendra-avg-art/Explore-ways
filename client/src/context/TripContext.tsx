import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Place, TripRoute } from '../types/travel';
import { DEMO_PLACES } from '../data/demoPlaces';
import { useLocation } from './LocationContext';
import { usePlaces } from './PlacesContext';
import { usePreferences } from './PreferencesContext';
import { 
  calculateTripRoute, 
  optimizeRouteNearestNeighbor,
  fetchRealRoadDirections
} from '../services/routingService';
import {
  calculateItinerarySchedule,
  calculateItineraryFeasibility,
  generateItineraryExplanation
} from '../services/itineraryEngineService';
import {
  buildRouteTransportComparison,
  getRepresentativeTravelTimeMin
} from '../services/transportTimeService';
import {
  computeTripFareSummary,
  buildLegFareComparison
} from '../services/fareEstimationService';
import { recommendTripTransport } from '../services/transportRecommendationService';

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
  selectedTransport: import('../types/travel').TransportMode | null;
  setSelectedTransport: (mode: import('../types/travel').TransportMode | null) => void;
  recommendedTransport: import('../types/travel').TransportMode;
  activeTransport: import('../types/travel').TransportMode;
  resetToRecommendedTransport: () => void;
  reorderTripStops: (newOrderIds: string[]) => void;
}

const STORAGE_KEY = 'smart_travel_trip_place_ids';

const TripContext = createContext<TripContextType | undefined>(undefined);

export const TripProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { location } = useLocation();
  const { knownPlacesMap, registerPlace } = usePlaces();
  const { preferences } = usePreferences();

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
    return [];
  });

  const [isOptimized, setIsOptimized] = useState<boolean>(false);
  const [optimizedPlaceIds, setOptimizedPlaceIds] = useState<string[]>([]);
  const [distanceSavedKm, setDistanceSavedKm] = useState<number>(0);

  // User's explicit transport choice (null if using system recommendation)
  const [selectedTransport, setSelectedTransport] = useState<import('../types/travel').TransportMode | null>(null);

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

  // System recommended transport based on active stops and preferences
  const recommendedTransport: import('../types/travel').TransportMode = useMemo(() => {
    if (activeStops.length === 0) return 'auto';
    const origin = {
      label: location.isManual ? `${location.city} Center` : `${location.area || location.city}`,
      lat: location.lat,
      lon: location.lon,
      isActualGps: !location.isManual,
    };
    const base = calculateTripRoute(origin, activeStops, isOptimized, distanceSavedKm, 'auto', preferences);
    if (!base.legs || base.legs.length === 0) return 'auto';
    const rec = recommendTripTransport(
      base.legs.map((l) => ({ distanceKm: l.distanceKm, roadDurationMin: l.estimatedTravelTimeMin })),
      preferences
    );
    return rec.recommended.mode;
  }, [location, activeStops, isOptimized, distanceSavedKm, preferences]);

  // Active transport: user's explicit choice if set, otherwise system recommendation
  const activeTransport: import('../types/travel').TransportMode = selectedTransport ?? recommendedTransport;

  const setPreferredMode = (mode: import('../types/travel').TransportMode) => {
    setSelectedTransport(mode);
  };

  const resetToRecommendedTransport = () => {
    setSelectedTransport(null);
  };

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

    fetchRealRoadDirections(waypoints, activeTransport).then((res) => {
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
  }, [location.lat, location.lon, activeStops, activeTransport]);

  // Compute TripRoute metrics (instantly calculated, seamlessly enhanced with road geometry)
  const tripRoute: TripRoute = useMemo(() => {
    const origin = {
      label: location.isManual ? `${location.city} Center (Demo Hub)` : `${location.area || location.city} (Live GPS)`,
      lat: location.lat,
      lon: location.lon,
      isActualGps: !location.isManual,
    };
    const base = calculateTripRoute(origin, activeStops, isOptimized, distanceSavedKm, activeTransport, preferences);

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
          const repTime = getRepresentativeTravelTimeMin(activeTransport, comp.modes);
          const legFares = buildLegFareComparison(leg.fromName, leg.toName, roadLeg.distanceKm);

          return {
            ...leg,
            distanceKm: roadLeg.distanceKm,
            estimatedTravelTimeMin: repTime,
            transportMode: activeTransport,
            transportLabel: activeTransport.toUpperCase(),
            isRoadNetwork: true,
            maneuvers: roadLeg.maneuvers,
            transportComparison: comp,
            fareComparison: legFares,
            modeEstimates: {
              walk: {
                timeMin: comp.modes.walk.travelTimeMin || 1,
                costInr: 0,
                label: 'Walking',
                fareDisplay: comp.fares?.walk.fareDisplay || 'Free',
                distanceKm: roadLeg.distanceKm,
                statusLabel: comp.modes.walk.statusLabel,
              },
              auto: {
                timeMin: comp.modes.auto.travelTimeMin || 5,
                costInr: comp.fares ? Math.round((comp.fares.auto.minFareInr + comp.fares.auto.maxFareInr) / 2) : 0,
                costRange: comp.fares?.auto.fareDisplay || 'Estimated',
                label: 'Auto Rickshaw',
                fareDisplay: comp.fares?.auto.fareDisplay || 'Estimated',
                distanceKm: roadLeg.distanceKm,
                timeDisplay: comp.modes.auto.travelTimeDisplay,
                statusLabel: comp.modes.auto.statusLabel,
              },
              cab: {
                timeMin: comp.modes.cab.travelTimeMin || 5,
                costInr: comp.fares ? Math.round((comp.fares.cab.minFareInr + comp.fares.cab.maxFareInr) / 2) : 0,
                costRange: comp.fares?.cab.fareDisplay || 'Estimated',
                label: 'Cab (Ola/Uber)',
                fareDisplay: comp.fares?.cab.fareDisplay || 'Estimated',
                distanceKm: roadLeg.distanceKm,
                timeDisplay: comp.modes.cab.travelTimeDisplay,
                statusLabel: comp.modes.cab.statusLabel,
              },
              bus: {
                timeMin: 0,
                costInr: 0,
                costRange: comp.fares?.bus.fareDisplay || 'Unavailable',
                label: 'Bus / Metro',
                fareDisplay: comp.fares?.bus.fareDisplay || 'Unavailable',
                distanceKm: undefined,
                timeDisplay: 'Unavailable',
                statusLabel: 'Not available',
              },
            },
          };
        }
        return leg;
      });

      // Recalculate schedule, feasibility, and explanation with real road network legs
      const schedule = calculateItinerarySchedule(activeStops, enhancedLegs, '09:00', preferences.pace);
      const feasibility = calculateItineraryFeasibility(schedule, preferences, activeTransport, activeStops);
      const itineraryExplanation = generateItineraryExplanation(
        origin,
        activeStops,
        enhancedLegs,
        preferences,
        activeTransport,
        feasibility,
        distanceSavedKm
      );

      // Selected mode user-facing time display
      let selectedModeTimeDisplay: string;
      if (activeTransport === 'bus') {
        selectedModeTimeDisplay = 'Unavailable';
      } else if (enhancedLegs.length === 1 && enhancedLegs[0].transportComparison) {
        selectedModeTimeDisplay = enhancedLegs[0].transportComparison.modes[activeTransport].travelTimeDisplay;
      } else {
        selectedModeTimeDisplay = `${schedule.totalTravelMin} min`;
      }

      // Multi-stop sum of per-leg fare estimates
      const fareSummary = computeTripFareSummary(
        enhancedLegs.map((l) => ({ fromName: l.fromName, toName: l.toName, distanceKm: l.distanceKm })),
        activeTransport
      );
      const totalEstimatedTransportCostInr = Math.round((fareSummary.totalMinFareInr + fareSummary.totalMaxFareInr) / 2);

      return {
        ...base,
        totalDistanceKm: roadGeometry.totalDistanceKm ?? base.totalDistanceKm,
        totalTravelTimeMin: schedule.totalTravelMin,
        totalVisitTimeMin: schedule.totalVisitMin,
        totalEstimatedDurationMin: schedule.totalTripMin,
        preferredMode: activeTransport,
        legs: enhancedLegs,
        routeCoordinates: roadGeometry.routeCoordinates,
        isRoadNetwork: roadGeometry.isRoadNetwork,
        routingSource: roadGeometry.routingSource,
        selectedModeTimeDisplay,
        fareSummary,
        selectedModeFareDisplay: fareSummary.totalFareDisplay,
        totalEstimatedTransportCostInr,
        schedule,
        feasibility,
        itineraryExplanation,
      };
    }

    return base;
  }, [location, activeStops, isOptimized, distanceSavedKm, activeTransport, roadGeometry, preferences]);

  // Route Optimization (Nearest Neighbor / Smart Multi-Factor)
  const optimizeTripRoute = () => {
    if (manualStops.length <= 1) return;
    const res = optimizeRouteNearestNeighbor(
      { lat: location.lat, lon: location.lon },
      manualStops,
      preferences,
      activeTransport
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
        allUpdatedPlaces,
        preferences,
        activeTransport
      );
      setOptimizedPlaceIds(res.orderedStops.map((p) => p.id));
      setDistanceSavedKm(res.distanceSavedKm);
    }
  };

  // Remove a place
  const removeFromTrip = (placeId: string) => {
    const updated = manualPlaceIds.filter((id) => id !== placeId);
    setManualPlaceIds(updated);

    if (updated.length === 0) {
      setOptimizedPlaceIds([]);
      setIsOptimized(false);
      setDistanceSavedKm(0);
      setRoadGeometry(null);
      setSelectedTransport(null);
      return;
    }

    if (updated.length === 1) {
      setOptimizedPlaceIds(updated);
      setIsOptimized(false);
      setDistanceSavedKm(0);
      return;
    }

    if (isOptimized) {
      const allUpdatedPlaces = updated
        .map((id) => knownPlacesMap[id] || DEMO_PLACES.find((p) => p.id === id))
        .filter((p): p is Place => Boolean(p));
      const res = optimizeRouteNearestNeighbor(
        { lat: location.lat, lon: location.lon },
        allUpdatedPlaces,
        preferences,
        activeTransport
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
    setRoadGeometry(null);
    setSelectedTransport(null);
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

  const reorderTripStops = (newOrderIds: string[]) => {
    setIsOptimized(false);
    setDistanceSavedKm(0);
    const existingSet = new Set(manualPlaceIds);
    const valid = newOrderIds.filter((id) => existingSet.has(id));
    manualPlaceIds.forEach((id) => {
      if (!valid.includes(id)) valid.push(id);
    });
    setManualPlaceIds(valid);
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
        preferredMode: activeTransport,
        setPreferredMode,
        selectedTransport,
        setSelectedTransport,
        recommendedTransport,
        activeTransport,
        resetToRecommendedTransport,
        reorderTripStops,
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
