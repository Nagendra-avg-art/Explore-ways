import React, { createContext, useContext, useState, ReactNode } from 'react';
import { GeoLocation, LocationStatus } from '../types/travel';

interface LocationContextType {
  location: GeoLocation;
  status: LocationStatus;
  errorMessage: string | null;
  detectLocation: () => Promise<void>;
  setManualLocation: (loc: GeoLocation) => void;
  isLocationModalOpen: boolean;
  setIsLocationModalOpen: (open: boolean) => void;
}

const DEFAULT_LOCATION: GeoLocation = {
  lat: 17.3616,
  lon: 78.4747,
  city: 'Hyderabad',
  area: 'Charminar',
  state: 'Telangana',
  country: 'India',
  formatted: 'Near Charminar, Hyderabad',
  isManual: true
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [location, setLocation] = useState<GeoLocation>(() => {
    try {
      const cached = localStorage.getItem('smart_travel_location');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // ignore
    }
    return DEFAULT_LOCATION;
  });

  const [status, setStatus] = useState<LocationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);

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
          const res = await fetch(`/api/location/reverse?lat=${latitude}&lon=${longitude}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();

          const detected: GeoLocation = {
            lat: latitude,
            lon: longitude,
            city: data.city || 'Detected City',
            area: data.area || 'Current Location',
            state: data.state || '',
            country: data.country || 'India',
            formatted: `Near ${data.area || data.city}, ${data.city}`,
            fullAddress: data.fullAddress,
            isManual: false
          };

          setLocation(detected);
          setStatus('granted');
          localStorage.setItem('smart_travel_location', JSON.stringify(detected));
        } catch (err) {
          console.warn('Reverse geocoding error:', err);
          // Fallback to coordinates
          const fallbackLoc: GeoLocation = {
            lat: latitude,
            lon: longitude,
            city: 'Your City',
            area: 'Local Area',
            formatted: `GPS Location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
            isManual: false
          };
          setLocation(fallbackLoc);
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
        // Open manual picker when location fails
        setIsLocationModalOpen(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 300000 // 5 minutes cache
      }
    );
  };

  const setManualLocation = (loc: GeoLocation) => {
    const updated: GeoLocation = {
      ...loc,
      isManual: true,
      formatted: `Near ${loc.area || loc.city}, ${loc.city}`
    };
    setLocation(updated);
    setStatus('granted');
    setErrorMessage(null);
    localStorage.setItem('smart_travel_location', JSON.stringify(updated));
    setIsLocationModalOpen(false);
  };

  return (
    <LocationContext.Provider
      value={{
        location,
        status,
        errorMessage,
        detectLocation,
        setManualLocation,
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
