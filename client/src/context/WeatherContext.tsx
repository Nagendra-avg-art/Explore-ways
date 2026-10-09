import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { WeatherData } from '../types/weather';
import { getLiveWeather } from '../services/weatherService';
import { useLocation } from './LocationContext';

interface WeatherContextType {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  refreshWeather: () => Promise<void>;
  isHourlyExpanded: boolean;
  setIsHourlyExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

export const WeatherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { location } = useLocation();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isHourlyExpanded, setIsHourlyExpanded] = useState<boolean>(false);

  const lastCoordsRef = useRef<{ lat: number; lon: number; city?: string } | null>(null);
  const hasWeatherRef = useRef<boolean>(false);
  const weatherReqIdRef = useRef<number>(0);

  useEffect(() => {
    hasWeatherRef.current = !!weather;
  }, [weather]);

  const fetchWeather = useCallback(async (forceRefresh: boolean = false) => {
    if (!location || typeof location.lat !== 'number' || typeof location.lon !== 'number') {
      setLoading(false);
      return;
    }

    // Coordinate sensitivity check to avoid unnecessary refetches
    if (!forceRefresh && lastCoordsRef.current) {
      const dLat = Math.abs(lastCoordsRef.current.lat - location.lat);
      const dLon = Math.abs(lastCoordsRef.current.lon - location.lon);
      const sameCity = lastCoordsRef.current.city === location.city;
      if (dLat < 0.02 && dLon < 0.02 && sameCity && hasWeatherRef.current) {
        return; // Retain current weather
      }
    }

    const reqId = ++weatherReqIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const data = await getLiveWeather(location.lat, location.lon, location.city, forceRefresh);
      if (reqId !== weatherReqIdRef.current) return;
      setWeather(data);
      lastCoordsRef.current = { lat: location.lat, lon: location.lon, city: location.city };
      setError(null);
    } catch (err: any) {
      if (reqId !== weatherReqIdRef.current) return;
      console.warn('[WeatherContext] Failed to load weather:', err.message || err);
      setError('Weather information is temporarily unavailable.');
    } finally {
      if (reqId === weatherReqIdRef.current) {
        setLoading(false);
      }
    }
  }, [location?.lat, location?.lon, location?.city]);

  // Refetch when location coordinates change
  useEffect(() => {
    if (location?.lat && location?.lon) {
      fetchWeather(false);
    }
  }, [location?.lat, location?.lon, location?.city, fetchWeather]);

  const refreshWeather = async () => {
    await fetchWeather(true);
  };

  return (
    <WeatherContext.Provider
      value={{
        weather,
        loading,
        error,
        refreshWeather,
        isHourlyExpanded,
        setIsHourlyExpanded,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
};

export const useWeather = (): WeatherContextType => {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
};
