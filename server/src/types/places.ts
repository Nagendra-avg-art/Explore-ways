// server/src/types/places.ts
// Shared place and food data contracts for the backend

export interface BackendPlace {
  id: string;
  name: string;
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
  shortDescription: string;
  fullDescription?: string;
  whyRecommended: string;
  tags: string[];
  openingHours?: string;
  openHour?: number;  // 24h format (e.g., 9 for 9 AM)
  closeHour?: number; // 24h format (e.g., 17.5 for 5:30 PM)
  closedDays?: number[]; // 0 = Sunday, 5 = Friday, etc.
  entryFee?: string;
  nearbyFood?: string[];
  transportEstimates?: { mode: string; label: string; time: string; cost: string; icon: string }[];
  source?: 'live' | 'demo';
  sourceName?: string;
  address?: string;
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
