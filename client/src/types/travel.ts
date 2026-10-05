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
  rating?: number;
  reviewCount?: number;
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
  source?: 'live' | 'demo';
  sourceName?: string;
  address?: string;
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

export type TransportMode = 'walk' | 'auto' | 'cab' | 'bus';

export interface RouteManeuver {
  instruction: string;
  distanceMeters: number;
  durationSeconds?: number;
}

export type DataStatus = 'road-route' | 'estimated' | 'unavailable';

export interface TransportTimeDetail {
  mode: TransportMode;
  modeLabel: string;
  icon: string;
  isAvailable: boolean;
  distanceKm: number | null;
  distanceDisplay: string;
  travelTimeMin: number | null;
  travelTimeDisplay: string;
  timeRangeMin?: [number, number];
  status: DataStatus;
  statusLabel: string;
  statusDescription: string;
  assumptions?: string;
}

export interface RouteTransportComparison {
  fromName: string;
  toName: string;
  roadDistanceKm: number;
  isRoadNetwork: boolean;
  routingSource: string;
  modes: {
    walk: TransportTimeDetail;
    auto: TransportTimeDetail;
    cab: TransportTimeDetail;
    bus: TransportTimeDetail;
  };
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
  coordinates?: [number, number][]; // Street geometry for this specific leg
  isRoadNetwork?: boolean;
  maneuvers?: RouteManeuver[];
  transportComparison?: RouteTransportComparison;
  modeEstimates: {
    walk: { timeMin: number; costInr: number; label: string; fareDisplay?: string; distanceKm?: number; statusLabel?: string };
    auto: { timeMin: number; costInr: number; costRange: string; label: string; fareDisplay?: string; distanceKm?: number; timeDisplay?: string; statusLabel?: string };
    cab: { timeMin: number; costInr: number; costRange: string; label: string; fareDisplay?: string; distanceKm?: number; timeDisplay?: string; statusLabel?: string };
    bus: { timeMin: number; costInr: number; costRange: string; label: string; fareDisplay?: string; distanceKm?: number; timeDisplay?: string; statusLabel?: string };
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
  preferredMode: TransportMode;
  totalEstimatedTransportCostInr: number;
  isOptimized: boolean;
  distanceSavedKm?: number;
  routeCoordinates?: [number, number][]; // Complete road polyline [lat, lon][]
  isRoadNetwork?: boolean;
  routingSource?: string;
  selectedModeTimeDisplay?: string;
}




