export type CategoryId = 
  | 'all'
  | 'temples'
  | 'history'
  | 'food'
  | 'nature'
  | 'architecture'
  | 'shopping'
  | 'cafes'
  | 'photography'
  | 'culture';

export interface Category {
  id: CategoryId;
  label: string;
  icon: string;
  accentColor: string; // Tailwind color class for tag styling
  bgActive: string;
  textActive: string;
}

export interface TransportEstimate {
  mode: 'walk' | 'auto' | 'cab' | 'bus';
  label: string;
  time: string;
  cost: string;
  icon: string;
}

export interface Place {
  id: string;
  name: string;
  category: CategoryId;
  categoryLabel: string;
  rating: number;
  reviewCount: number;
  distanceKm: number;
  travelTimeMin: number;
  visitDuration: string;
  imageUrl: string;
  shortDescription: string;
  fullDescription?: string;
  whyRecommended: string;
  tags: string[];
  openingHours?: string;
  bestTimeToVisit?: string;
  nearbyFood?: string[];
  transportEstimates?: TransportEstimate[];
}

export type TimeOption = '2h' | '4h' | 'halfDay' | 'fullDay';
export type BudgetOption = '500' | '1000' | '2000' | '5000';
export type SortOption = 'recommended' | 'distance' | 'rating';

export type LocationStatus = 
  | 'idle' 
  | 'detecting' 
  | 'granted' 
  | 'denied' 
  | 'unavailable' 
  | 'timeout' 
  | 'error';

export interface GeoLocation {
  lat: number;
  lon: number;
  city: string;
  area: string;
  state?: string;
  country?: string;
  formatted: string;
  fullAddress?: string;
  isManual?: boolean;
}


