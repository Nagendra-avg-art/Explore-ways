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

export type FoodCategory =
  | 'all'
  | 'local'
  | 'indian'
  | 'restaurant'
  | 'cafe'
  | 'fast_food'
  | 'vegetarian'
  | 'budget';

export type FoodPriceLevel = 'budget' | 'moderate' | 'expensive' | 'unavailable';

export interface FoodPlace extends Place {
  cuisine?: string;
  priceLevel: FoodPriceLevel;
  priceLevelDisplay: string;
  openingHoursDisplay: string;
  phone?: string;
  website?: string;
  takeaway?: boolean;
  delivery?: boolean;
  vegetarian?: boolean;
  foodCategory: FoodCategory;
  foodCategoryLabel: string;
  recommendationReason: string;
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

export interface FareEstimate {
  mode: TransportMode;
  modeLabel: string;
  isAvailable: boolean;
  minFareInr: number;
  maxFareInr: number;
  fareDisplay: string; // e.g. "Free", "₹120–₹160 estimated", "Unavailable"
  isEstimate: boolean;
  currency: string; // "INR"
  assumptions: string;
  breakdown?: {
    baseFare: number;
    distanceComponent: number;
    bufferComponent?: number;
  };
}

export interface LegFareComparison {
  fromName: string;
  toName: string;
  distanceKm: number;
  modes: {
    walk: FareEstimate;
    auto: FareEstimate;
    cab: FareEstimate;
    bus: FareEstimate;
  };
}

export interface TripFareSummary {
  preferredMode: TransportMode;
  totalMinFareInr: number;
  totalMaxFareInr: number;
  totalFareDisplay: string; // e.g. "Free", "₹240–₹320 estimated", "Unavailable"
  currency: string;
  isEstimate: boolean;
  assumptions: string;
  legs: {
    legIndex: number;
    fromName: string;
    toName: string;
    distanceKm: number;
    fare: FareEstimate;
  }[];
}

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
  fareEstimate?: FareEstimate;
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
  fares?: {
    walk: FareEstimate;
    auto: FareEstimate;
    cab: FareEstimate;
    bus: FareEstimate;
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
  fareComparison?: LegFareComparison;
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
  fareSummary?: TripFareSummary;
  selectedModeFareDisplay?: string;
  recommendation?: TransportRecommendationResult;
  schedule?: ItinerarySchedule;
  feasibility?: ItineraryFeasibility;
  itineraryExplanation?: ItineraryExplanation;
}

export interface TransportScoreBreakdown {
  timeScore: number;         // 0-100: how well travel time fits available schedule & pace
  budgetScore: number;       // 0-100: how comfortably fare fits budget amount
  distanceScore: number;     // 0-100: suitability of mode for this specific distance
  styleScore: number;        // 0-100: alignment with solo/couple/family/friends
  availabilityScore: number; // 0-100: data reliability & operational availability
}

export interface TransportModeRecommendation {
  mode: TransportMode;
  modeLabel: string;
  icon: string;
  score: number;             // 0-100 composite weighted score
  tagline: string;           // e.g. "Best balance of travel time and budget"
  matchReasons: string[];    // Data-driven bullet explanations
  isRecommended: boolean;    // true for the highest scoring viable mode
  role: 'recommended' | 'alternative' | 'budget' | 'unavailable';
  scoreBreakdown: TransportScoreBreakdown;
  fareEstimate: FareEstimate;
  travelTimeMin: number;
  travelTimeDisplay: string;
  distanceKm: number;
}

export interface TransportRecommendationResult {
  recommended: TransportModeRecommendation;
  alternatives: TransportModeRecommendation[]; // Viable available alternatives
  unavailableModes: TransportModeRecommendation[];
  allRanked: TransportModeRecommendation[];
  budgetImpact: {
    tripBudgetInr: number;
    estimatedFareMinInr: number;
    estimatedFareMaxInr: number;
    remainingBudgetMinInr: number;
    remainingBudgetMaxInr: number;
    percentOfBudget: number;
  };
  timeImpact: {
    availableHours: number;
    availableMinutes: number;
    transitTimeMinutes: number;
    remainingTimeMinutes: number;
    timeSavingsVsWalkMin?: number;
  };
  summaryExplanation: string;
}

export type FeasibilityStatus = 'feasible' | 'tight' | 'exceeded';

export interface ItineraryStopSchedule {
  stopIndex: number;
  place: Place;
  arrivalTimeStr: string;   // e.g. "09:20"
  departureTimeStr: string; // e.g. "10:05"
  visitDurationMin: number;
  visitDurationDisplay: string;
  isFallbackEstimate: boolean;
  durationSourceLabel: string;
  openStatus: 'open' | 'closed' | 'unavailable';
  openStatusLabel: string;
  openStatusDetail?: string;
}

export interface ItinerarySchedule {
  startTimeStr: string;
  originDepartureStr: string;
  stops: ItineraryStopSchedule[];
  endTimeStr: string;
  totalTravelMin: number;
  totalVisitMin: number;
  bufferMin: number;
  totalTripMin: number;
}

export interface ItineraryFeasibility {
  status: FeasibilityStatus;
  statusLabel: string; // "Schedule Feasible" | "Tight Schedule" | "Schedule Not Feasible"
  statusBadgeColor: 'emerald' | 'amber' | 'rose';
  availableMinutes: number;
  totalTravelMinutes: number;
  totalVisitMinutes: number;
  bufferMinutes: number;
  totalTripMinutes: number;
  remainingMinutes: number; // buffer remaining (>= 0 if feasible or tight)
  exceededMinutes: number;  // excess minutes (> 0 if exceeded)
  headline: string;
  explanation: string;
  suggestions: string[];
}

export interface ItineraryExplanation {
  overallReason: string;
  stopReasons: {
    stopIndex: number;
    placeId: string;
    placeName: string;
    reason: string;
  }[];
  transportReason: string;
  efficiencyReason: string;
}

