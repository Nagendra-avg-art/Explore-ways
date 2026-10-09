import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GeoLocation, LocationStatus } from '../types/travel';
import { getApiUrl } from '../services/apiConfig';

interface LocationContextType {
  location: GeoLocation; // Active destination (for full backward compatibility)
  destination: GeoLocation; // Authoritative selected travel destination
  currentLocation: GeoLocation | null; // Physical device GPS location (null if not granted)
  status: LocationStatus;
  errorMessage: string | null;
  detectLocation: () => Promise<void>;
  setManualLocation: (loc: GeoLocation) => void;
  setDestination: (loc: GeoLocation) => void;
  useCurrentLocationAsDestination: () => void;
  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (open: boolean) => void;
}

const DEFAULT_DESTINATION: GeoLocation = {
  lat: 17.3616,
  lon: 78.4747,
  city: 'Hyderabad',
  area: 'Old City / Charminar',
  state: 'Telangana',
  country: 'India',
  formatted: 'Near Charminar, Hyderabad',
  isManual: true
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Authoritative physical device location (from GPS)
  const [currentLocation, setCurrentLocation] = useState<GeoLocation | null>(() => {
    try {
      const cached = localStorage.getItem('smart_travel_current_gps');
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return null;
  });

  // Authoritative selected travel destination
  const [destination, setDestinationState] = useState<GeoLocation>(() => {
    try {
      const cached = localStorage.getItem('smart_travel_destination') || localStorage.getItem('smart_travel_location');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // ignore
    }
    return DEFAULT_DESTINATION;
  });

  const [status, setStatus] = useState<LocationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

  // Set selected destination
  const setDestination = (loc: GeoLocation) => {
    const updated: GeoLocation = {
      ...loc,
      isManual: true,
      formatted: loc.formatted || (loc.area && loc.area !== loc.city ? `${loc.area}, ${loc.city}` : loc.city)
    };
    setDestinationState(updated);
    setStatus('granted');
    setErrorMessage(null);
    localStorage.setItem('smart_travel_destination', JSON.stringify(updated));
    localStorage.setItem('smart_travel_location', JSON.stringify(updated));
    setIsLocationModalOpen(false);
  };

  const setManualLocation = (loc: GeoLocation) => {
    setDestination(loc);
  };

  const useCurrentLocationAsDestination = () => {
    if (currentLocation) {
      setDestination(currentLocation);
    }
  };

  // Detect location via browser Geolocation API
  const detectLocation = async (): Promise<void> => {
    if (!navigator.geolocation) {
      setStatus('unavailable');
      setErrorMessage('Geolocation is not supported by your browser.');
      setIsLocationModalOpen(true);
      return;
    }

    setStatus('detecting');
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(getApiUrl(`/api/location/reverse?lat=${latitude}&lon=${longitude}`));
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();

          const detected: GeoLocation = {
            lat: latitude,
            lon: longitude,
            city: data.city || 'Current Location',
            area: data.area || 'GPS Location',
            state: data.state || '',
            country: data.country || 'India',
            formatted: data.formatted || `Near ${data.area || data.city}, ${data.city}`,
            fullAddress: data.fullAddress,
            isManual: false
          };

          setCurrentLocation(detected);
          localStorage.setItem('smart_travel_current_gps', JSON.stringify(detected));
          
          // Also set as active destination
          setDestinationState(detected);
          localStorage.setItem('smart_travel_destination', JSON.stringify(detected));
          localStorage.setItem('smart_travel_location', JSON.stringify(detected));
          
          setStatus('granted');
        } catch (err) {
          console.warn('Reverse geocoding error:', err);
          const fallbackLoc: GeoLocation = {
            lat: latitude,
            lon: longitude,
            city: 'Current Location',
            area: 'Device Coordinates',
            formatted: `GPS Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
            isManual: false
          };
          setCurrentLocation(fallbackLoc);
          setDestinationState(fallbackLoc);
          setStatus('granted');
        }
      },
      (error) => {
        let errorMsg = 'Could not determine your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setStatus('denied');
            errorMsg = 'Location permission was denied. You can select your city manually below.';
            break;
          case error.POSITION_UNAVAILABLE:
            setStatus('unavailable');
            errorMsg = 'GPS location is currently unavailable on this device. Please select your city manually.';
            break;
          case error.TIMEOUT:
            setStatus('timeout');
            errorMsg = 'GPS location request timed out. Please select your city manually.';
            break;
          default:
            setStatus('error');
            errorMsg = error.message || 'An unknown error occurred while detecting location.';
        }
        setErrorMessage(errorMsg);
        setIsLocationModalOpen(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 300000 // 5 minutes cache
      }
    );
  };

  return (
    <LocationContext.Provider
      value={{
        location: destination, // Points directly to authoritative destination
        destination,
        currentLocation,
        status,
        errorMessage,
        detectLocation,
        setManualLocation,
        setDestination,
        useCurrentLocationAsDestination,
        isLocationModalOpen,
        setIsLocationModalOpen,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = (): LocationContextType => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

