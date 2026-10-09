// server/src/types/places.ts
// Unified Normalized Place and Dining Data Contracts with Provenance & Confidence

export type DataConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type PlaceProvenance = 'osm' | 'curated' | 'commercial';

export interface PhotoMetadata {
  photoUrl: string | null;
  photoSource?: string;
  attribution?: string;
  license?: string;
  verifiedForPlace: boolean;
  sourcePlaceId?: string;
  lastChecked?: string;
}

export interface BackendPlace {
  id: string;
  internalId?: string;
  provider?: string;
  providerPlaceId?: string;
  name: string;
  officialName?: string;
  alternateNames?: string[];
  category: string;
  categoryLabel: string;
  rating?: number;
  reviewCount?: number;
  lat: number;
  lon: number;
  distanceKm?: number;
  travelTimeMin?: number;
  isOpenNow?: boolean;
  visitDuration: string;
  imageUrl: string;
  photo?: PhotoMetadata;
  shortDescription: string;
  fullDescription?: string;
  whyRecommended: string;
  tags: string[];
  openingHours?: string;
  openHour?: number;  // 24h format (e.g., 9 for 9 AM)
  closeHour?: number; // 24h format (e.g., 17.5 for 5:30 PM)
  closedDays?: number[]; // 0 = Sunday, 5 = Friday, etc.
  entryFee?: string;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  nearbyFood?: string[];
  transportEstimates?: { mode: string; label: string; time: string; cost: string; icon: string }[];
  source?: 'live' | 'demo' | 'curated';
  sourceName?: string;
  provenance?: PlaceProvenance;
  confidence?: DataConfidence;
  verified?: boolean;
  lastUpdated?: string;
}

export type FoodCategory =
  | 'local'
  | 'indian'
  | 'restaurant'
  | 'cafe'
  | 'fast_food'
  | 'vegetarian'
  | 'budget';

export type FoodPriceLevel = 'budget' | 'moderate' | 'expensive' | 'unavailable';

export interface BackendFoodPlace extends BackendPlace {
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
