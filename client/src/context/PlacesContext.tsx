// client/src/context/PlacesContext.tsx
// Production Place Discovery Context with Strict Location Safety & Demo Isolation

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { Place } from '../types/travel';
import { useLocation } from './LocationContext';
import { getApiUrl } from '../services/apiConfig';

interface PlacesContextType {
  places: Place[];
  isLiveDiscovery: boolean;
  isLoading: boolean;
  discoveryError: string | null;
  sourceName: string;
  totalFound: number;
  discoverNearbyPlaces: (lat: number, lon: number, radius?: number) => Promise<void>;
  useDemoFallback: () => void;
  knownPlacesMap: Record<string, Place>;
  registerPlace: (place: Place) => void;
}

const PlacesContext = createContext<PlacesContextType | undefined>(undefined);

export const PlacesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { location } = useLocation();

  // Registry of all known places discovered or viewed during the user session
  const [knownPlacesMap, setKnownPlacesMap] = useState<Record<string, Place>>({});

  const [places, setPlaces] = useState<Place[]>([]);
  const [isLiveDiscovery, setIsLiveDiscovery] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string>('Searching verified places...');

  // Concurrency & Race Condition Guards (Prevent stale requests overwriting new destinations)
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentRequestIdRef = useRef<number>(0);

  const registerPlace = useCallback((place: Place) => {
    setKnownPlacesMap((prev) => ({
      ...prev,
      [place.id]: place,
    }));
  }, []);

  // Backward-compatible stub: never forces demo fallback in production flows
  const useDemoFallback = useCallback(() => {
    // In strict real-world mode, does not inject fake data
  }, []);

  const discoverNearbyPlaces = useCallback(async (lat: number, lon: number, radius: number = 6000) => {
    // Abort any in-flight request for previous destination or radius
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = ++currentRequestIdRef.current;

    setIsLoading(true);
    setDiscoveryError(null);

    try {
      const res = await fetch(getApiUrl(`/api/places/nearby?lat=${lat}&lon=${lon}&radius=${radius}`), {
        signal: controller.signal
      });

      if (requestId !== currentRequestIdRef.current) {
        return; // Discard superseded response
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to discover nearby places`);
      }

      const data = await res.json();

      if (requestId !== currentRequestIdRef.current) {
        return; // Discard superseded response
      }

      if (data.success && Array.isArray(data.places) && data.places.length > 0) {
        const fetchedPlaces: Place[] = data.places;

        // Register all fetched places in knownPlacesMap
        setKnownPlacesMap((prev) => {
          const updated = { ...prev };
          fetchedPlaces.forEach((p) => {
            updated[p.id] = p;
          });
          return updated;
        });

        setPlaces(fetchedPlaces);
        setIsLiveDiscovery(data.isLive === true);
        setSourceName(data.sourceName || (data.isLive ? 'OpenStreetMap Live POIs' : 'Verified Curated Places'));
      } else {
        // Data trust: do NOT show unrelated demo places for any destination
        setPlaces([]);
        setIsLiveDiscovery(false);
        setSourceName('No verified places found nearby');
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') {
        // Request was deliberately aborted due to location change; do not update error state
        return;
      }
      if (requestId !== currentRequestIdRef.current) {
        return;
      }
      console.warn('Nearby place discovery failed:', (err as Error)?.message);
      setDiscoveryError('Places are temporarily unavailable. Please try again.');
      setPlaces([]);
      setIsLiveDiscovery(false);
      setSourceName('Discovery temporarily unavailable');
    } finally {
      if (requestId === currentRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Location Safety Rule: When destination coordinates change, invalidate stale places and refresh
  useEffect(() => {
    if (location.lat !== undefined && location.lon !== undefined) {
      // Invalidate old places immediately to prevent visual bleed from previous city
      setPlaces([]);
      setKnownPlacesMap({});
      discoverNearbyPlaces(location.lat, location.lon);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [location.lat, location.lon, discoverNearbyPlaces]);

  return (
    <PlacesContext.Provider
      value={{
        places,
        isLiveDiscovery,
        isLoading,
        discoveryError,
        sourceName,
        totalFound: places.length,
        discoverNearbyPlaces,
        useDemoFallback,
        knownPlacesMap,
        registerPlace,
      }}
    >
      {children}
    </PlacesContext.Provider>
  );
};

export const usePlaces = (): PlacesContextType => {
  const context = useContext(PlacesContext);
  if (!context) {
    throw new Error('usePlaces must be used within a PlacesProvider');
  }
  return context;
};
