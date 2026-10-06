import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { FoodPlace } from '../types/travel';
import { useLocation } from './LocationContext';
import { usePreferences } from './PreferencesContext';
import { fetchFoodPlaces } from '../services/foodExplorerService';
import { scoreFoodPlace } from '../services/foodRecommendationService';

export type FoodFilterType = 
  | 'all' 
  | 'openNow' 
  | 'budget' 
  | 'restaurant' 
  | 'cafe' 
  | 'vegetarian';

interface FoodContextType {
  foodPlaces: FoodPlace[];
  filteredFoodPlaces: FoodPlace[];
  radius: number;
  setRadius: (r: number) => void;
  activeFilter: FoodFilterType;
  setActiveFilter: (f: FoodFilterType) => void;
  isLoading: boolean;
  error: string | null;
  isLive: boolean;
  sourceLabel: string;
  refreshFoodPlaces: () => Promise<void>;
  expandRadius: () => void;
}

const FoodContext = createContext<FoodContextType | undefined>(undefined);

export const FoodProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { location } = useLocation();
  const { preferences } = usePreferences();

  const [foodPlaces, setFoodPlaces] = useState<FoodPlace[]>([]);
  const [radius, setRadius] = useState<number>(5000); // 5 km default
  const [activeFilter, setActiveFilter] = useState<FoodFilterType>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [sourceLabel, setSourceLabel] = useState<string>('Live OpenStreetMap data');

  const loadFood = useCallback(async (r: number) => {
    if (!location.lat || !location.lon) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchFoodPlaces(location.lat, location.lon, r);
      setFoodPlaces(data.places);
      setIsLive(data.isLive);
      setSourceLabel(data.sourceLabel);
    } catch (err: any) {
      console.warn('Food discovery error:', err.message);
      setError('Food places couldn\'t be loaded right now.');
    } finally {
      setIsLoading(false);
    }
  }, [location.lat, location.lon]);

  // Load when location or radius changes
  useEffect(() => {
    loadFood(radius);
  }, [loadFood, radius]);

  const refreshFoodPlaces = useCallback(async () => {
    await loadFood(radius);
  }, [loadFood, radius]);

  const expandRadius = useCallback(() => {
    if (radius < 10000) {
      setRadius(10000);
    }
  }, [radius]);

  // Score all places using recommendation logic
  const scoredPlaces = useMemo(() => {
    return foodPlaces.map((food) => {
      const scoreData = scoreFoodPlace(food, location.lat, location.lon, preferences);
      return {
        ...food,
        matchScore: scoreData.matchScore,
        matchReasons: scoreData.matchReasons,
        recommendationReason: scoreData.recommendationReason,
        distanceKm: scoreData.distanceKm
      };
    });
  }, [foodPlaces, location.lat, location.lon, preferences]);

  // Client-side filtering (fast, zero redundant API requests)
  const filteredFoodPlaces = useMemo(() => {
    let result = [...scoredPlaces];

    if (activeFilter === 'openNow') {
      result = result.filter((p) => p.isOpenNow === true);
    } else if (activeFilter === 'budget') {
      result = result.filter((p) => p.priceLevel === 'budget');
    } else if (activeFilter === 'restaurant') {
      result = result.filter((p) => p.foodCategory === 'restaurant' || p.foodCategory === 'local' || p.foodCategory === 'indian');
    } else if (activeFilter === 'cafe') {
      result = result.filter((p) => p.foodCategory === 'cafe');
    } else if (activeFilter === 'vegetarian') {
      result = result.filter((p) => p.vegetarian === true || p.foodCategory === 'vegetarian');
    }

    // Sort by recommendation matchScore descending
    result.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return result;
  }, [scoredPlaces, activeFilter]);

  return (
    <FoodContext.Provider
      value={{
        foodPlaces,
        filteredFoodPlaces,
        radius,
        setRadius,
        activeFilter,
        setActiveFilter,
        isLoading,
        error,
        isLive,
        sourceLabel,
        refreshFoodPlaces,
        expandRadius
      }}
    >
      {children}
    </FoodContext.Provider>
  );
};

export const useFood = (): FoodContextType => {
  const context = useContext(FoodContext);
  if (!context) {
    throw new Error('useFood must be used within a FoodProvider');
  }
  return context;
};
