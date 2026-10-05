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
  lat: number;
  lon: number;
  imageUrl: string;
  shortDescription: string;
  fullDescription?: string;
  whyRecommended: string;
  tags: string[];
  openingHours?: string;
  bestTimeToVisit?: string;
  nearbyFood?: string[];
  transportEstimates?: TransportEstimate[];
  isOpenNow?: boolean;
  entryFee?: string;
  matchScore?: number;
  matchReasons?: string[];
  scoreBreakdown?: ScoreBreakdown;
}

export interface ScoreBreakdown {
  interest: number;
  distance: number;
  rating: number;
  timeFit: number;
  budgetFit: number;
  openStatus: number;
  styleFit: number;
}

export interface RecommendedPlace extends Place {
  matchScore: number;
  matchReasons: string[];
  scoreBreakdown: ScoreBreakdown;
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

export type TravelStyle = 'solo' | 'couple' | 'family' | 'friends';
export type TravelPace = 'relaxed' | 'moderate' | 'fast';

export interface UserPreferences {
  interests: CategoryId[];
  availableHours: number;
  budgetAmount: number;
  travelStyle: TravelStyle;
  pace: TravelPace;
  maxDistanceKm?: number | null;
  minRating?: number | null;
  openNowOnly?: boolean;
  isConfigured: boolean;
}

export interface RouteLeg {
  legIndex: number;
  fromName: string;
  toName: string;
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  distanceKm: number;
  estimatedTravelTimeMin: number;
  modeEstimates: {
    walk: { timeMin: number; costInr: number };
    auto: { timeMin: number; costInr: number };
    cab: { timeMin: number; costInr: number };
    bus: { timeMin: number; costInr: number };
  };
}

export interface TripRoute {
  origin: {
    label: string;
    lat: number;
    lon: number;
    isActualGps: boolean;
  };
  stops: Place[];
  legs: RouteLeg[];
  totalDistanceKm: number;
  totalTravelTimeMin: number;
  totalVisitTimeMin: number;
  totalEstimatedDurationMin: number;
  isOptimized: boolean;
  distanceSavedKm?: number;
}




