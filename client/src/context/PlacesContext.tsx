import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Place } from '../types/travel';
import { DEMO_PLACES } from '../data/demoPlaces';
import { useLocation } from './LocationContext';

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

  // Registry of all known places (demo places + any discovered live places)
  const [knownPlacesMap, setKnownPlacesMap] = useState<Record<string, Place>>(() => {
    const initial: Record<string, Place> = {};
    DEMO_PLACES.forEach((p) => {
      initial[p.id] = { ...p, source: 'demo', sourceName: 'Curated Demo Hub' };
    });
    return initial;
  });

  const [places, setPlaces] = useState<Place[]>(() => {
    return DEMO_PLACES.map((p) => ({
      ...p,
      source: 'demo' as const,
      sourceName: 'Curated Demo Hub',
    }));
  });

  const [isLiveDiscovery, setIsLiveDiscovery] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState<string>('Curated Demo Hub');

  const registerPlace = useCallback((place: Place) => {
    setKnownPlacesMap((prev) => ({
      ...prev,
      [place.id]: place,
    }));
  }, []);

  const useDemoFallback = useCallback(() => {
    const demoWithUpdatedDist = DEMO_PLACES.map((p) => ({
      ...p,
      source: 'demo' as const,
      sourceName: 'Curated Demo Hub',
    }));
    setPlaces(demoWithUpdatedDist);
    setIsLiveDiscovery(false);
    setSourceName('Curated Demo Hub');
  }, []);

  const discoverNearbyPlaces = useCallback(async (lat: number, lon: number, radius: number = 6000) => {
    setIsLoading(true);
    setDiscoveryError(null);

    try {
      const res = await fetch(`/api/places/nearby?lat=${lat}&lon=${lon}&radius=${radius}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to discover nearby places`);
      }

      const data = await res.json();
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
        setSourceName(data.sourceName || (data.isLive ? 'OpenStreetMap Live POI' : 'Curated Demo Seed'));
      } else {
        useDemoFallback();
      }
    } catch (err: unknown) {
      console.warn('Nearby place discovery failed, using demo fallback:', (err as Error)?.message);
      setDiscoveryError((err as Error)?.message || 'Nearby discovery temporarily unavailable');
      useDemoFallback();
    } finally {
      setIsLoading(false);
    }
  }, [useDemoFallback]);

  // Whenever user switches to a live GPS location or updates manual city, auto-discover or refresh places
  useEffect(() => {
    if (!location.isManual) {
      // User triggered real GPS! Discover real live nearby places around user
      discoverNearbyPlaces(location.lat, location.lon);
    } else {
      // Manual hub (e.g. Hyderabad default or manual city chosen in modal)
      const isHyd = Math.abs(location.lat - 17.3616) < 0.15 && Math.abs(location.lon - 78.4747) < 0.15;
      if (isHyd) {
        useDemoFallback();
      } else {
        discoverNearbyPlaces(location.lat, location.lon);
      }
    }
  }, [location.lat, location.lon, location.isManual, discoverNearbyPlaces, useDemoFallback]);

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
