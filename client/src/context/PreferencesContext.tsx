import React, { createContext, useContext, useState, useEffect } from 'react';
import { CategoryId, UserPreferences } from '../types/travel';

export const DEFAULT_PREFERENCES: UserPreferences = {
  interests: ['history', 'food', 'temples'],
  availableHours: 4,
  budgetAmount: 1000,
  travelStyle: 'solo',
  pace: 'moderate',
  isConfigured: false,
};

const STORAGE_KEY = 'smart_travel_preferences_v1';

interface PreferencesContextType {
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  toggleInterest: (categoryId: CategoryId) => void;
  isPreferencesModalOpen: boolean;
  setIsPreferencesModalOpen: (open: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_PREFERENCES,
          ...parsed,
          isConfigured: true,
        };
      }
    } catch (err) {
      console.warn('Failed to parse saved preferences from localStorage:', err);
    }
    return DEFAULT_PREFERENCES;
  });

  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (err) {
      console.warn('Failed to save preferences to localStorage:', err);
    }
  }, [preferences]);

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      ...updates,
      isConfigured: true,
    }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.warn('Failed to remove preferences from localStorage:', err);
    }
  };

  const toggleInterest = (categoryId: CategoryId) => {
    setPreferences((prev) => {
      const exists = prev.interests.includes(categoryId);
      let newInterests: CategoryId[];
      if (exists) {
        // Prevent deselecting everything: keep at least 1 interest
        if (prev.interests.length <= 1) return prev;
        newInterests = prev.interests.filter((id) => id !== categoryId);
      } else {
        newInterests = [...prev.interests, categoryId];
      }
      return {
        ...prev,
        interests: newInterests,
        isConfigured: true,
      };
    });
  };

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        updatePreferences,
        resetPreferences,
        toggleInterest,
        isPreferencesModalOpen,
        setIsPreferencesModalOpen,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = (): PreferencesContextType => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
